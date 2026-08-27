"""
SIF Precursor Detection - AI/NLP Service
Three sub-modules:
  A) SIF Classifier: lexicon + zero-shot NLI
  B) LSR Tagger: keyword lexicon + zero-shot NLI
  C) Pattern Mining: GLiNER NER + sentence-transformers clustering
"""
import os
import re
from typing import List, Dict, Any, Optional
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from sentence_transformers import SentenceTransformer
import spacy
from gliner import GLiNER
import numpy as np
from sklearn.cluster import KMeans

app = FastAPI(title="SIF AI Service", version="1.0.0")


# ---------- Configuration ----------
class Settings(BaseSettings):
    SIF_THRESHOLD: float = 0.5
    ZERO_SHOT_MODEL: str = "facebook/bart-large-mnli"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    GLINER_MODEL: str = "urchade/gliner_medium-v2.1"

settings = Settings()


# ---------- Lazy-loaded Models ----------
@lru_cache(maxsize=1)
def get_zero_shot_classifier():
    return pipeline("zero-shot-classification", model=settings.ZERO_SHOT_MODEL, device=0 if torch.cuda.is_available() else -1)


@lru_cache(maxsize=1)
def get_embedding_model():
    return SentenceTransformer(settings.EMBEDDING_MODEL, device="cuda" if torch.cuda.is_available() else "cpu")


@lru_cache(maxsize=1)
def get_gliner():
    return GLiNER.from_pretrained(settings.GLINER_MODEL)


@lru_cache(maxsize=1)
def get_spacy():
    return spacy.load("en_core_web_sm")


# ---------- A) SIF CLASSIFIER ----------
# High-energy / fatal-potential keywords from DEKRA/EEI SIF precursor model
SIF_LEXICON = {
    # Energy sources
    "suspended_load": ["suspended load", "overhead load", "lifting", "crane", "rigging", "hoist", "sling"],
    "pressure_release": ["pressure release", "high pressure", "pressurized", "rupture", "burst", "blowout", "relief valve"],
    "hazardous_substance": ["h2s", "hydrogen sulfide", "toxic gas", "flammable", "explosive", "chemical release", "asphyxiation"],
    "fall_height": ["fall from height", "working at height", "scaffold", "ladder", "roof", "elevated", "fall protection"],
    "confined_space": ["confined space", "vessel entry", "tank entry", "permit required", "gas test", "oxygen deficient"],
    "energy_isolation": ["lockout", "tagout", "loto", "isolation", "de-energize", "zero energy", "stored energy"],
    "line_of_fire": ["line of fire", "pinch point", "crush point", "struck by", "caught between", "moving equipment"],
    "electrical": ["arc flash", "electrocution", "high voltage", "energized", "live circuit", "electrical shock"],
    "fire_explosion": ["flash fire", "explosion", "ignition source", "hot work", "welding", "cutting", "grinding"],
    "vehicle": ["vehicle", "truck", "forklift", "mobile equipment", "reversing", "blind spot", "traffic"],
}

# Barrier failure keywords (DEKRA model)
BARRIER_LEXICON = {
    "permit_absent": ["no permit", "without permit", "permit not obtained", "permit missing"],
    "guard_removed": ["guard removed", "guard missing", "bypassed guard", "safety device disabled"],
    "isolation_missing": ["not isolated", "isolation not verified", "loto not applied", "energy not isolated"],
    "gas_test_skipped": ["gas test not done", "no gas test", "atmosphere not tested"],
    "procedure_not_followed": ["procedure not followed", "shortcut taken", "deviation from procedure"],
    "training_gap": ["untrained", "not trained", "unqualified", "unauthorized"],
    "communication_failure": ["miscommunication", "not informed", "unaware of", "no briefing"],
}


def sif_lexicon_score(text: str) -> float:
    """Heuristic score based on SIF precursor keyword presence."""
    text_lower = text.lower()
    hits = 0
    for category, keywords in SIF_LEXICON.items():
        for kw in keywords:
            if kw in text_lower:
                hits += 1
    # Normalize: 0-1 based on hit count (cap at 10 hits = 1.0)
    return min(hits / 10.0, 1.0)


def barrier_failure_tags(text: str) -> List[str]:
    """Detect barrier failure types from text."""
    text_lower = text.lower()
    tags = []
    for barrier, keywords in BARRIER_LEXICON.items():
        for kw in keywords:
            if kw in text_lower:
                tags.append(barrier)
                break
    return tags


def zero_shot_sif(narrative: str) -> float:
    """Zero-shot classification: SIF-potential vs non-SIF."""
    classifier = get_zero_shot_classifier()
    candidate_labels = [
        "serious injury or fatality potential",
        "minor injury or property damage only"
    ]
    result = classifier(narrative, candidate_labels, hypothesis_template="This report describes {}.", multi_label=False)
    # Return probability of SIF label
    sif_idx = result["labels"].index("serious injury or fatality potential")
    return result["scores"][sif_idx]


def ensemble_sif_probability(narrative: str) -> float:
    """Combine lexicon heuristic + zero-shot NLI."""
    lex_score = sif_lexicon_score(narrative)
    zs_score = zero_shot_sif(narrative)
    # Weighted ensemble (tune weights based on validation)
    return 0.3 * lex_score + 0.7 * zs_score


# ---------- B) LSR TAGGER ----------
IOGP_LSR_2021 = [
    "Bypassing Safety Controls",
    "Confined Space",
    "Driving",
    "Energy Isolation",
    "Hot Work",
    "Line of Fire",
    "Safe Mechanical Lifting",
    "Work Authorisation",
    "Working at Height",
]

LSR_KEYWORDS = {
    "Bypassing Safety Controls": ["bypass", "bypassed", "override", "defeated", "disabled safety", "removed guard", "jumped"],
    "Confined Space": ["confined space", "vessel entry", "tank entry", "manhole", "permit required confined", "gas test", "oxygen deficient"],
    "Driving": ["vehicle", "truck", "forklift", "driving", "mobile equipment", "reversing", "traffic", "road", "journey"],
    "Energy Isolation": ["lockout", "tagout", "loto", "isolation", "de-energize", "zero energy", "stored energy", "verification", "isolation certificate"],
    "Hot Work": ["hot work", "welding", "cutting", "grinding", "burning", "open flame", "fire watch", "hot work permit", "flammable"],
    "Line of Fire": ["line of fire", "pinch point", "crush point", "struck by", "caught between", "moving part", "suspended load", "dropped object"],
    "Safe Mechanical Lifting": ["lifting", "crane", "rigging", "hoist", "sling", "shackle", "load chart", "lifting plan", "mechanical lifting"],
    "Work Authorisation": ["permit to work", "ptw", "work permit", "authorisation", "authorization", "permit system", "safe work method"],
    "Working at Height": ["working at height", "fall protection", "harness", "scaffold", "ladder", "roof work", "elevated work", "fall arrest"],
}


def lsr_keyword_match(text: str) -> Dict[str, List[str]]:
    """Return dict of rule -> matched keywords."""
    text_lower = text.lower()
    matches = {}
    for rule, keywords in LSR_KEYWORDS.items():
        matched = [kw for kw in keywords if kw in text_lower]
        if matched:
            matches[rule] = matched
    return matches


def zero_shot_lsr(narrative: str, threshold: float = 0.4) -> List[Dict]:
    """Zero-shot NLI against 9 LSR descriptions."""
    classifier = get_zero_shot_classifier()
    
    # Descriptions aligned with IOGP Report 459
    lsr_descriptions = {
        "Bypassing Safety Controls": "Worker deliberately bypasses or disables a safety control or device.",
        "Confined Space": "Work inside a confined space with atmospheric hazards or engulfment risk.",
        "Driving": "Operating a vehicle or mobile equipment on roads or site.",
        "Energy Isolation": "Lockout-tagout or isolation of hazardous energy sources before work.",
        "Hot Work": "Work involving ignition sources, flames, or heat in flammable atmospheres.",
        "Line of Fire": "Worker positioned in the path of moving objects, pressure release, or dropped objects.",
        "Safe Mechanical Lifting": "Crane, hoist, or rigging operations lifting suspended loads.",
        "Work Authorisation": "Permit to work or formal authorization required before starting task.",
        "Working at Height": "Work at elevation with fall hazard requiring fall protection.",
    }
    
    labels = list(lsr_descriptions.values())
    result = classifier(narrative, labels, hypothesis_template="This situation involves {}.", multi_label=True)
    
    tagged = []
    for label, score in zip(result["labels"], result["scores"]):
        if score >= threshold:
            rule_name = list(lsr_descriptions.keys())[labels.index(label)]
            tagged.append({"rule_name": rule_name, "confidence": float(score), "matched_keywords": []})
    return tagged


def ensemble_lsr_tags(narrative: str) -> List[Dict]:
    """Combine keyword matches + zero-shot."""
    kw_matches = lsr_keyword_match(narrative)
    zs_tags = zero_shot_lsr(narrative)
    
    # Merge: prefer keyword matches (higher precision), add zero-shot for recall
    merged = {}
    for rule, keywords in kw_matches.items():
        merged[rule] = {"rule_name": rule, "confidence": min(0.9, 0.5 + 0.1 * len(keywords)), "matched_keywords": keywords}
    
    for tag in zs_tags:
        rule = tag["rule_name"]
        if rule not in merged:
            merged[rule] = tag
        else:
            # Boost confidence if both agree
            merged[rule]["confidence"] = min(0.95, merged[rule]["confidence"] + 0.1)
    
    return list(merged.values())


# ---------- C) PATTERN MINING ----------
# GLiNER entity labels for oil-field safety reports
GLINER_LABELS = [
    "activity", "location", "equipment", "chemical", "person_role",
    "injury_type", "barrier", "permit_type", "time_reference"
]


def extract_entities(narrative: str) -> List[Dict]:
    """Extract structured entities using GLiNER."""
    gliner = get_gliner()
    entities = gliner.predict_entities(narrative, GLINER_LABELS, threshold=0.35)
    return [
        {"entity_type": e["label"], "entity_value": e["text"], "confidence": float(e["score"])}
        for e in entities
    ]


# ---------- Request/Response Models ----------
class AnalyzeRequest(BaseModel):
    narrative: str
    site: Optional[str] = None
    activity: Optional[str] = None


class SIFResult(BaseModel):
    sif_probability: float
    sif_flag: bool
    confidence_level: str
    explanation_snippets: List[str] = []


class LSRTag(BaseModel):
    rule_name: str
    confidence: float
    matched_keywords: List[str] = []


class Entity(BaseModel):
    entity_type: str
    entity_value: str
    confidence: float


class AnalyzeResponse(BaseModel):
    sif: SIFResult
    lsr_tags: List[LSRTag]
    entities: List[Entity]


# ---------- API ----------
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    narrative = request.narrative.strip()
    if not narrative:
        raise HTTPException(400, "Narrative cannot be empty")

    # A) SIF Classification
    sif_prob = ensemble_sif_probability(narrative)
    sif_flag = sif_prob >= settings.SIF_THRESHOLD
    confidence_level = "high" if sif_prob > 0.75 else "medium" if sif_prob > 0.45 else "low"
    
    # Explanation: highlight trigger phrases (simple keyword extraction for demo)
    explanation_snippets = []
    text_lower = narrative.lower()
    for category, keywords in SIF_LEXICON.items():
        for kw in keywords:
            if kw in text_lower and kw not in explanation_snippets:
                explanation_snippets.append(kw)
    explanation_snippets = explanation_snippets[:5]  # top 5

    # B) LSR Tags
    lsr_tags = ensemble_lsr_tags(narrative)

    # C) Entities
    entities = extract_entities(narrative)

    # Barrier failure tags as special entities
    barrier_tags = barrier_failure_tags(narrative)
    for b in barrier_tags:
        entities.append({"entity_type": "barrier_failure", "entity_value": b.replace("_", " "), "confidence": 0.8})

    return {
        "sif": {
            "sif_probability": round(sif_prob, 3),
            "sif_flag": sif_flag,
            "confidence_level": confidence_level,
            "explanation_snippets": explanation_snippets,
        },
        "lsr_tags": lsr_tags,
        "entities": entities,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)