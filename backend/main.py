"""
SIF Precursor Detection - Backend API

FastAPI backend service.

Responsibilities:
- Serve safety reports to the frontend (list/detail/create)
- Bulk CSV upload + batch AI analysis
- Forward single reports to the AI service and persist results
- Dashboard statistics for the UI
- Database connection and health checks
"""

import csv
import io
import os
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from dotenv import load_dotenv

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

import crud
import models
import schemas
from database import Base, engine, get_db

# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

# Local development (./start.sh): AI service runs on http://127.0.0.1:8001
# Docker (docker-compose.yml sets this): http://ai:8001
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://127.0.0.1:8001")

# Comma-separated list of allowed frontend origins, "*" allows everything (default, demo-friendly)
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
_origins = ["*"] if CORS_ORIGINS.strip() == "*" else [o.strip() for o in CORS_ORIGINS.split(",")]


# ============================================================
# APPLICATION LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist yet (Postgres in docker also gets
    # database/init.sql on first boot; this is a safety net + what SQLite
    # local dev relies on).
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database connected and schema ensured.")
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
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HEALTH CHECKS
# ============================================================

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
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")


@app.get("/health/ai")
async def health_ai():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{AI_SERVICE_URL}/health")
        if response.status_code == 200:
            return {"status": "healthy", "ai_service": "connected"}
        raise HTTPException(status_code=502, detail="AI service unhealthy")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {e}")


# ============================================================
# SINGLE REPORT ANALYSIS (proxy to AI service)
# ============================================================

@app.post("/api/analyze")
async def analyze_report(request: schemas.AnalyzeRequest, db: Session = Depends(get_db)):
    """
    Send a narrative to the AI service for SIF/LSR analysis.
    If `report_id` is supplied, persist the AI result against that report.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{AI_SERVICE_URL}/analyze",
                json={
                    "narrative": request.narrative,
                    "site": request.site,
                    "activity": request.activity,
                },
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"AI service returned status {response.status_code}",
        )

    result = response.json()

    if request.report_id:
        report = crud.get_report(db, request.report_id)
        if report:
            crud.save_ai_result(db, report, result)
        else:
            result["warning"] = f"report_id '{request.report_id}' not found; result not persisted"

    return result


# ============================================================
# LIST / CREATE REPORTS
# ============================================================

@app.get("/api/reports", response_model=schemas.ReportListOut)
async def list_reports(
    site: Optional[str] = None,
    category: Optional[str] = None,
    risk: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sif_only: bool = False,
    batch_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    total, reports = crud.list_reports(
        db,
        site=site,
        category=category,
        risk=risk,
        status=status,
        search=search,
        sif_only=sif_only,
        batch_id=batch_id,
        limit=limit,
        offset=offset,
    )
    return schemas.ReportListOut(
        total=total,
        limit=limit,
        offset=offset,
        reports=[crud.report_to_out(r) for r in reports],
    )


@app.post("/api/reports", response_model=schemas.ReportOut)
async def create_report(payload: schemas.ReportCreate, db: Session = Depends(get_db)):
    report = crud.create_report(db, payload)
    return crud.report_to_out(report)


@app.get("/api/reports/{report_id}", response_model=schemas.ReportOut)
async def get_report(report_id: str, db: Session = Depends(get_db)):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found")
    return crud.report_to_out(report)


# ============================================================
# BULK CSV UPLOAD
# ============================================================

@app.post("/api/reports/upload", response_model=schemas.UploadResponse)
async def upload_reports(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a CSV of safety reports.

    Accepted headers (case-insensitive, flexible naming):
        report_id, date/report_date, category/report_type, description/narrative,
        risk, status, location/site, activity, reportedBy/reported_by
    Only `description`/`narrative` is required per row.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")

    raw = await file.read()
    try:
        text_data = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text_data = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text_data))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file has no header row")

    # normalize headers to lowercase/underscore for flexible matching
    reader.fieldnames = [ (h or "").strip() for h in reader.fieldnames ]
    rows = [{k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()} for row in reader]

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file has no data rows")

    batch = crud.create_batch(db, filename=file.filename, total_reports=0)
    created = crud.bulk_create_reports(db, rows, batch_id=batch.id)

    batch.total_reports = created
    db.commit()

    return schemas.UploadResponse(
        batch_id=batch.id,
        filename=file.filename,
        total_reports=created,
        message=f"Uploaded and stored {created} report(s). Call /api/reports/analyze-batch to run AI analysis.",
    )


# ============================================================
# BATCH ANALYSIS
# ============================================================

@app.post("/api/reports/analyze-batch", response_model=schemas.BatchAnalyzeResponse)
async def analyze_batch(
    batch_id: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    Run AI analysis on every report in a batch that hasn't been analyzed yet.
    """
    batch = crud.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found")

    pending = crud.reports_pending_analysis(db, batch_id)
    already_analyzed = (batch.total_reports or 0) - len(pending)

    analyzed = 0
    failed = 0
    sif_count = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        for report in pending:
            try:
                response = await client.post(
                    f"{AI_SERVICE_URL}/analyze",
                    json={
                        "narrative": report.narrative,
                        "site": report.site,
                        "activity": report.activity,
                    },
                )
                if response.status_code != 200:
                    failed += 1
                    continue

                result = response.json()
                crud.save_ai_result(db, report, result)
                analyzed += 1
                if result.get("sif", {}).get("sif_flag"):
                    sif_count += 1

            except httpx.RequestError:
                failed += 1

    batch.sif_count = (batch.sif_count or 0) + sif_count
    db.commit()

    return schemas.BatchAnalyzeResponse(
        batch_id=batch_id,
        total_reports=batch.total_reports or 0,
        analyzed=analyzed,
        already_analyzed=max(already_analyzed, 0),
        sif_count=batch.sif_count or 0,
        failed=failed,
    )


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
async def dashboard_stats(db: Session = Depends(get_db)):
    return crud.dashboard_stats(db)


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
