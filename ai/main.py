"""
SIF Precursor Detection - AI/NLP Service
"""

from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from analyser import analyse_report


app = FastAPI(
    title="SIF AI Service",
    version="1.0.0"
)


# ==================================================
# REQUEST MODELS
# ==================================================

class AnalyzeRequest(BaseModel):
    narrative: str
    site: Optional[str] = None
    activity: Optional[str] = None


# ==================================================
# RESPONSE MODELS
# ==================================================

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


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/health")
async def health():

    return {
        "status": "healthy",
        "service": "ai"
    }


# ==================================================
# ANALYSE SAFETY REPORT
# ==================================================

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):

    try:

        # ------------------------------------------
        # RUN YOUR HYBRID ML + RULE-BASED ANALYSER
        # ------------------------------------------

        result = analyse_report(request.narrative)


        # ------------------------------------------
        # GET CONFIDENCE
        # ------------------------------------------

        confidence = float(result["confidence"])


        # ------------------------------------------
        # DETERMINE CONFIDENCE LEVEL
        # ------------------------------------------

        if confidence >= 0.80:
            confidence_level = "high"

        elif confidence >= 0.60:
            confidence_level = "medium"

        else:
            confidence_level = "low"


        # ------------------------------------------
        # CREATE SIF RESULT
        # ------------------------------------------

        sif_result = SIFResult(

            sif_probability=confidence,

            sif_flag=result["sif_potential"],

            confidence_level=confidence_level,

            explanation_snippets=result["key_indicators"]
        )


        # ------------------------------------------
        # CREATE LIFE-SAVING RULE TAG
        # ------------------------------------------

        lsr_tags = []

        if result["life_saving_rule"] != "None":

            lsr_tags.append(

                LSRTag(

                    rule_name=result["life_saving_rule"],

                    confidence=confidence,

                    matched_keywords=result["key_indicators"]
                )
            )


        # ------------------------------------------
        # CREATE ENTITY LIST
        # ------------------------------------------

        entities = []


        # Activity

        if result["activity"] != "Unknown":

            entities.append(

                Entity(

                    entity_type="activity",

                    entity_value=result["activity"],

                    confidence=0.90
                )
            )


        # Location

        if result["location"] != "Unknown":

            entities.append(

                Entity(

                    entity_type="location",

                    entity_value=result["location"],

                    confidence=0.90
                )
            )


        # Barrier Failure

        if result["barrier_failure"] != "None identified":

            entities.append(

                Entity(

                    entity_type="barrier_failure",

                    entity_value=result["barrier_failure"],

                    confidence=0.90
                )
            )


        # ------------------------------------------
        # RETURN STRUCTURED RESPONSE
        # ------------------------------------------

        return AnalyzeResponse(

            sif=sif_result,

            lsr_tags=lsr_tags,

            entities=entities
        )


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==================================================
# RUN APPLICATION
# ==================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
