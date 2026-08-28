"""
SIF Precursor Detection - Backend API
Works with both PostgreSQL (Docker) and SQLite (local dev via ./start.sh)
"""
import os
import csv
import io
import json
from datetime import datetime, date
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import engine, get_db, Base
import models

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8001")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables for both SQLite and Postgres (init.sql handles Postgres via Docker, this handles SQLite)
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables ensured")
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database connected successfully")
    except Exception as e:
        print(f"Database setup failed: {e}")
    yield

app = FastAPI(title="SIF Precursor Detection API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ---------- Pydantic Models ----------
class AnalyzeRequest(BaseModel):
    narrative: str
    site: Optional[str] = None
    activity: Optional[str] = None

class CreateReportRequest(BaseModel):
    report_id: Optional[str] = None
    category: str
    description: str
    risk: str
    status: str = "Open"
    location: str
    date: str
    reported_by: str = "Safety Officer"

def _parse_date(s: str):
    if not s:
        return None
    for fmt in ("%d %B %Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except:
            continue
    return None

def report_to_dict(r: models.Report):
    return {
        "id": r.report_id,
        "db_id": r.id,
        "category": r.report_type,
        "description": r.narrative,
        "risk": r.risk,
        "status": r.status,
        "location": r.site,
        "date": r.report_date.isoformat() if r.report_date else "",
        "reportedBy": r.reported_by,
        "batch_id": r.batch_id,
    }

# ---------- Health ----------
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

# ---------- Create single report ----------
@app.post("/api/reports")
async def create_report(payload: CreateReportRequest, db: Session = Depends(get_db)):
    # auto-generate report_id if not supplied
    if payload.report_id:
        report_id = payload.report_id
        if db.query(models.Report).filter_by(report_id=report_id).first():
            raise HTTPException(400, detail="report_id already exists")
    else:
        max_num = 0
        for (rid,) in db.query(models.Report.report_id).all():
            try:
                n = int(rid.split("-")[1])
                max_num = max(max_num, n)
            except:
                continue
        report_id = f"R-{str(max_num+1).zfill(3)}"

    r = models.Report(
        report_id=report_id,
        report_date=_parse_date(payload.date),
        site=payload.location,
        activity=payload.category,
        report_type=payload.category,
        risk=payload.risk,
        status=payload.status,
        reported_by=payload.reported_by,
        narrative=payload.description,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return report_to_dict(r)

# ---------- Analyze ----------
@app.post("/api/analyze")
async def analyze_report(request: AnalyzeRequest, db: Session = Depends(get_db)):
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(f"{AI_SERVICE_URL}/analyze", json=request.model_dump())
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        # fallback mock if AI service unavailable
        return {
            "sif": {"sif_probability": 0.0, "sif_flag": False, "confidence_level": "low", "explanation_snippets": []},
            "lsr_tags": [],
            "entities": [],
            "warning": f"AI service unavailable: {e}"
        }

# ---------- Bulk upload ----------
@app.post("/api/reports/upload")
async def upload_reports(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        text_content = content.decode("utf-8")
    except:
        text_content = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text_content))
    # normalize header keys to lowercase
    rows = list(reader)
    if not rows:
        raise HTTPException(400, detail="Empty CSV")
    batch_id = str(__import__("uuid").uuid4())
    batch = models.Batch(filename=file.filename, total_reports=0)
    batch.id = batch_id
    db.add(batch)
    count = 0
    for row in rows:
        # lower-case keys
        low = {k.lower().strip(): v for k, v in row.items()}
        narrative = low.get("narrative") or low.get("description") or low.get("incident description") or low.get("incident_description") or ""
        if not narrative:
            continue
        site = low.get("site") or low.get("location") or ""
        activity = low.get("activity") or low.get("category") or low.get("report_type") or ""
        report_type = low.get("report_type") or low.get("category") or "Unsafe Act"
        report_id = low.get("report_id") or low.get("id") or None
        if not report_id:
            # generate sequential
            max_num = count + 1 + len(db.query(models.Report.report_id).all())
            report_id = f"R-{str(max_num).zfill(3)}"
        risk = low.get("risk") or low.get("risk level") or "Medium"
        status = low.get("status") or "Open"
        reported_by = low.get("reported by") or low.get("reported_by") or low.get("reportedby") or "Unknown"
        report_date = _parse_date(low.get("report_date") or low.get("date") or "")
        # ensure unique
        if db.query(models.Report).filter_by(report_id=report_id).first():
            report_id = f"{report_id}-{count}"
        r = models.Report(
            report_id=report_id,
            report_date=report_date,
            site=site,
            activity=activity,
            report_type=report_type,
            risk=risk,
            status=status,
            reported_by=reported_by,
            narrative=narrative,
            batch_id=batch_id,
        )
        db.add(r)
        count += 1
    batch.total_reports = count
    db.commit()
    return {"batch_id": batch_id, "filename": file.filename, "total_reports": count}

@app.post("/api/reports/analyze-batch")
async def analyze_batch(batch_id: str = Form(...), db: Session = Depends(get_db)):
    reports = db.query(models.Report).filter_by(batch_id=batch_id).all()
    if not reports:
        raise HTTPException(404, detail="Batch not found or no reports")
    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        for r in reports:
            try:
                resp = await client.post(f"{AI_SERVICE_URL}/analyze", json={"narrative": r.narrative, "site": r.site})
                data = resp.json() if resp.status_code == 200 else {}
            except Exception as e:
                data = {"error": str(e)}
            # store classification if sif present
            if "sif" in data:
                sif = data["sif"]
                c = models.Classification(
                    report_id=r.id,
                    sif_probability=sif.get("sif_probability", 0),
                    sif_flag=sif.get("sif_flag", False),
                    confidence_level=sif.get("confidence_level", "low"),
                    model_version="v1",
                    explanation_snippets=json.dumps(sif.get("explanation_snippets", [])),
                )
                db.add(c)
                for lsr in data.get("lsr_tags", []):
                    db.add(models.LSRTag(
                        report_id=r.id,
                        rule_name=lsr.get("rule_name", ""),
                        confidence=lsr.get("confidence", 0),
                        matched_keywords=json.dumps(lsr.get("matched_keywords", [])),
                    ))
                for ent in data.get("entities", []):
                    db.add(models.Entity(
                        report_id=r.id,
                        entity_type=ent.get("entity_type", ""),
                        entity_value=ent.get("entity_value", ""),
                        confidence=ent.get("confidence", 0),
                    ))
            results.append({"report_id": r.report_id, "result": data})
    db.commit()
    return {"batch_id": batch_id, "analyzed": len(results), "results": results}

@app.get("/api/reports")
async def list_reports(site: Optional[str] = None, sif_only: bool = False, category: Optional[str] = None, risk: Optional[str] = None, search: Optional[str] = None, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    q = db.query(models.Report)
    if site:
        q = q.filter(models.Report.site.ilike(f"%{site}%"))
    if category and category != "All Categories":
        q = q.filter(models.Report.report_type == category)
    if risk and risk != "All Risk Levels":
        q = q.filter(models.Report.risk == risk)
    if search:
        q = q.filter(models.Report.narrative.ilike(f"%{search}%") | models.Report.report_id.ilike(f"%{search}%"))
    if sif_only:
        # join classifications where sif_flag true
        q = q.join(models.Classification, models.Classification.report_id == models.Report.id).filter(models.Classification.sif_flag == True)
    total = q.count()
    rows = q.order_by(models.Report.created_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "reports": [report_to_dict(r) for r in rows]}

@app.get("/api/reports/{report_id}")
async def get_report(report_id: str, db: Session = Depends(get_db)):
    r = db.query(models.Report).filter_by(report_id=report_id).first()
    if not r:
        raise HTTPException(404, detail="Report not found")
    classifications = db.query(models.Classification).filter_by(report_id=r.id).all()
    lsr_tags = db.query(models.LSRTag).filter_by(report_id=r.id).all()
    entities = db.query(models.Entity).filter_by(report_id=r.id).all()
    return {
        **report_to_dict(r),
        "classifications": [{"sif_probability": c.sif_probability, "sif_flag": c.sif_flag, "confidence_level": c.confidence_level, "explanation_snippets": json.loads(c.explanation_snippets) if c.explanation_snippets else []} for c in classifications],
        "lsr_tags": [{"rule_name": l.rule_name, "confidence": l.confidence, "matched_keywords": json.loads(l.matched_keywords) if l.matched_keywords else []} for l in lsr_tags],
        "entities": [{"entity_type": e.entity_type, "entity_value": e.entity_value, "confidence": e.confidence} for e in entities],
    }

@app.get("/api/dashboard/stats")
async def dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(models.Report.id)).scalar() or 0
    by_type = dict(db.query(models.Report.report_type, func.count(models.Report.id)).group_by(models.Report.report_type).all())
    by_risk = dict(db.query(models.Report.risk, func.count(models.Report.id)).group_by(models.Report.risk).all())
    by_status = dict(db.query(models.Report.status, func.count(models.Report.id)).group_by(models.Report.status).all())
    sif_count = db.query(func.count(models.Classification.id)).filter(models.Classification.sif_flag == True).scalar() or 0
    lsr_counts = dict(db.query(models.LSRTag.rule_name, func.count(models.LSRTag.id)).group_by(models.LSRTag.rule_name).all())
    return {
        "total_reports": total,
        "by_category": by_type,
        "by_risk": by_risk,
        "by_status": by_status,
        "sif_count": sif_count,
        "lsr_counts": lsr_counts,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
