"""
SIF Precursor Detection - AI/NLP Service
Heuristic implementation: lexicon-based SIF classifier + LSR tagger
Works without heavy ML models for hackathon demo
"""
import re
from typing import Optional
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SIF AI Service", version="1.0.0")

SIF_KEYWORDS = ["suspended load", "no permit", "bypass", "confined space", "without ppe", "without permit", "fall", "height", "energy", "isolation", "hot work", "line of fire", "lifting", "crane", "scaffold", "gas leak", "electrical", "explosion", "fatality"]
LSR_RULES = {
    "Bypassing Safety Controls": ["bypass", "override", "interlock"],
    "Confined Space": ["confined space", "entry permit"],
    "Driving": ["vehicle", "driving", "collision"],
    "Energy Isolation": ["energy", "isolation", "lockout", "tagout", "loto"],
    "Hot Work": ["hot work", "welding", "spark"],
    "Line of Fire": ["suspended load", "line of fire", "crane", "lifting"],
    "Safe Mechanical Lifting": ["crane", "sling", "hoist", "load"],
    "Work Authorisation": ["permit", "authorization", "without permit", "no permit"],
    "Working at Height": ["height", "scaffold", "ladder", "fall", "harness"],
}

class AnalyzeRequest(BaseModel):
    narrative: str
    site: Optional[str] = None
    activity: Optional[str] = None

class SIFResult(BaseModel):
    sif_probability: float
    sif_flag: bool
    confidence_level: str
    explanation_snippets: list[str] = []

class LSRTag(BaseModel):
    rule_name: str
    confidence: float
    matched_keywords: list[str] = []

class Entity(BaseModel):
    entity_type: str
    entity_value: str
    confidence: float

class AnalyzeResponse(BaseModel):
    sif: SIFResult
    lsr_tags: list[LSRTag]
    entities: list[Entity]

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai"}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    text = request.narrative.lower()
    # SIF scoring
    hits = [k for k in SIF_KEYWORDS if k in text]
    prob = min(0.92, 0.25 + len(hits) * 0.18 + (0.15 if "critical" in text or "fatal" in text else 0))
    sif_flag = prob > 0.5
    level = "high" if prob > 0.7 else "medium" if prob > 0.5 else "low"

    lsr_tags = []
    for rule, kws in LSR_RULES.items():
        matched = [k for k in kws if k in text]
        if matched:
            lsr_tags.append(LSRTag(rule_name=rule, confidence=min(0.95, 0.6 + len(matched)*0.15), matched_keywords=matched))

    entities = []
    if request.site:
        entities.append(Entity(entity_type="location", entity_value=request.site, confidence=0.9))
    if request.activity:
        entities.append(Entity(entity_type="activity", entity_value=request.activity, confidence=0.85))
    # extract location-like phrases
    m = re.search(r"(drilling site|refinery|pipeline|workshop|zone [a-z])", text)
    if m and not request.site:
        entities.append(Entity(entity_type="location", entity_value=m.group(0), confidence=0.7))

    return AnalyzeResponse(
        sif=SIFResult(sif_probability=round(prob,2), sif_flag=sif_flag, confidence_level=level, explanation_snippets=hits[:5]),
        lsr_tags=lsr_tags,
        entities=entities
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
