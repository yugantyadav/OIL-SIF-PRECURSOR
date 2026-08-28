"""
SIF Precursor Detection - Backend API
FastAPI service - team will implement endpoints here.
"""
import os
from contextlib import asynccontextmanager
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sif.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai:8001")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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


app = FastAPI(
    title="SIF Precursor Detection API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Pydantic Models ----------
class AnalyzeRequest(BaseModel):
    narrative: str
    site: Optional[str] = None
    activity: Optional[str] = None


# ---------- Health Checks ----------
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "backend"}


@app.get("/health/db")
async def health_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(503, detail=f"Database unavailable: {e}")


# ---------- Placeholder Endpoints (Team implements these) ----------
@app.post("/api/analyze")
async def analyze_report(request: AnalyzeRequest):
    """Single report analysis - forwards to AI service."""
    # TODO: Implement - call AI service
    return {"message": "Not implemented yet", "endpoint": "/api/analyze"}


@app.post("/api/reports/upload")
async def upload_reports(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Bulk CSV upload - parses and stores reports."""
    # TODO: Implement CSV parsing and storage
    return {"message": "Not implemented yet", "endpoint": "/api/reports/upload"}


@app.post("/api/reports/analyze-batch")
async def analyze_batch(batch_id: str = Form(...), db: Session = Depends(get_db)):
    """Trigger analysis for all reports in a batch."""
    # TODO: Implement batch analysis
    return {"message": "Not implemented yet", "endpoint": "/api/reports/analyze-batch"}


@app.get("/api/reports")
async def list_reports(
    site: Optional[str] = None,
    sif_only: bool = False,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List reports with optional filters."""
    # TODO: Implement with DB queries
    return {"message": "Not implemented yet", "endpoint": "/api/reports"}


@app.get("/api/dashboard/stats")
async def dashboard_stats(db: Session = Depends(get_db)):
    """Dashboard KPI cards and chart data."""
    # TODO: Implement aggregations
    return {"message": "Not implemented yet", "endpoint": "/api/dashboard/stats"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)