"""
SIF Precursor Detection - Backend API

FastAPI backend service.

Responsibilities:
- Receive safety reports
- Forward reports to the AI service
- Database connection and health checks
- Later: CSV upload, batch analysis, report storage and dashboard statistics
"""

import os
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from dotenv import load_dotenv

from fastapi import (
    FastAPI,
    File,
    UploadFile,
    Form,
    HTTPException,
    Depends
)

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session


# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://sif_user:sif_pass@localhost:5432/sif_db"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ============================================================
# AI SERVICE CONFIGURATION
# ============================================================

# Local development:
# AI service runs on http://127.0.0.1:8001
#
# Docker:
# This can later be changed to http://ai:8001

AI_SERVICE_URL = os.getenv(
    "AI_SERVICE_URL",
    "http://127.0.0.1:8001"
)


# ============================================================
# DATABASE SESSION
# ============================================================

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ============================================================
# APPLICATION LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    try:

        with engine.connect() as conn:

            conn.execute(text("SELECT 1"))

        print("Database connected successfully")

    except Exception as e:

        print(f"Database connection failed: {e}")

    yield

    engine.dispose()


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SIF Precursor Detection API",
    version="1.0.0",
    lifespan=lifespan
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# PYDANTIC MODELS
# ============================================================

class AnalyzeRequest(BaseModel):

    narrative: str

    site: Optional[str] = None

    activity: Optional[str] = None


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health():

    return {
        "status": "healthy",
        "service": "backend"
    }


# ============================================================
# DATABASE HEALTH CHECK
# ============================================================

@app.get("/health/db")
async def health_db():

    try:

        with engine.connect() as conn:

            conn.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected"
        }

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {e}"
        )


# ============================================================
# SINGLE REPORT ANALYSIS
# ============================================================

@app.post("/api/analyze")
async def analyze_report(request: AnalyzeRequest):
    """
    Receive a safety report from the frontend/client
    and forward it to the AI service.
    """

    try:

        # ----------------------------------------------------
        # Send report to AI service
        # ----------------------------------------------------

        async with httpx.AsyncClient(timeout=30.0) as client:

            response = await client.post(

                f"{AI_SERVICE_URL}/analyze",

                json={
                    "narrative": request.narrative,
                    "site": request.site,
                    "activity": request.activity
                }
            )


        # ----------------------------------------------------
        # Check AI service response
        # ----------------------------------------------------

        if response.status_code != 200:

            raise HTTPException(
                status_code=502,
                detail=(
                    "AI service returned "
                    f"status {response.status_code}"
                )
            )


        # ----------------------------------------------------
        # Return AI result to caller
        # ----------------------------------------------------

        return response.json()


    except httpx.RequestError as e:

        raise HTTPException(
            status_code=503,
            detail=f"AI service unavailable: {str(e)}"
        )


# ============================================================
# BULK CSV UPLOAD
# ============================================================

@app.post("/api/reports/upload")
async def upload_reports(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a CSV containing safety reports.

    TODO:
    - Validate CSV
    - Parse rows
    - Generate batch ID
    - Store reports in PostgreSQL
    """

    return {
        "message": "Not implemented yet",
        "endpoint": "/api/reports/upload"
    }


# ============================================================
# BATCH ANALYSIS
# ============================================================

@app.post("/api/reports/analyze-batch")
async def analyze_batch(
    batch_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Trigger AI analysis for all reports belonging
    to a particular batch.

    TODO:
    - Retrieve reports from database
    - Send each report to AI service
    - Store AI results
    - Return analysis summary
    """

    return {
        "message": "Not implemented yet",
        "endpoint": "/api/reports/analyze-batch",
        "batch_id": batch_id
    }


# ============================================================
# LIST REPORTS
# ============================================================

@app.get("/api/reports")
async def list_reports(
    site: Optional[str] = None,
    sif_only: bool = False,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Retrieve reports from the database.

    Optional filters:
    - site
    - sif_only
    - limit
    - offset

    TODO:
    - Implement database queries
    - Apply filters
    - Return paginated reports
    """

    return {
        "message": "Not implemented yet",
        "endpoint": "/api/reports",
        "site": site,
        "sif_only": sif_only,
        "limit": limit,
        "offset": offset
    }


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

@app.get("/api/dashboard/stats")
async def dashboard_stats(
    db: Session = Depends(get_db)
):
    """
    Return dashboard KPI and chart data.

    TODO:
    - Total reports
    - SIF reports
    - Non-SIF reports
    - SIF percentage
    - Life-Saving Rule distribution
    - Site distribution
    """

    return {
        "message": "Not implemented yet",
        "endpoint": "/api/dashboard/stats"
    }


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
