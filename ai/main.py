"""
SIF Precursor Detection - AI/NLP Service
Team will implement SIF classifier, LSR tagger, pattern mining here.
"""
import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="SIF AI Service", version="1.0.0")


# ---------- Request/Response Models ----------
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


# ---------- Health ----------
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai"}


# ---------- Placeholder Endpoint (Team implements) ----------
@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """
    Full NLP analysis:
    A) SIF Classifier: lexicon + zero-shot NLI / fine-tuned transformer
    B) LSR Tagger: keyword lexicon + zero-shot NLI against 9 IOGP rules
    C) Pattern Mining: GLiNER NER + sentence-transformers clustering
    """
    # TODO: Implement three sub-modules
    return AnalyzeResponse(
        sif=SIFResult(
            sif_probability=0.0,
            sif_flag=False,
            confidence_level="low",
            explanation_snippets=[]
        ),
        lsr_tags=[],
        entities=[]
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)