"""
SIF Precursor Detection - Backend API
FastAPI service handling report ingestion, analysis orchestration, and results serving.
"""
import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sif_user:sif_pass@localhost:5432/sif_db")
engine = create_engine(DATABASE_URL)
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
    # Startup: verify DB connection
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database connected successfully")
    except Exception as e:
        print(f"Database connection failed: {e}")
    yield
    # Shutdown
    engine.dispose()


app = FastAPI(
    title="SIF Precursor Detection API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Pydantic Models ----------
class ReportInput(BaseModel):
    report_id: str
    report_date: Optional[str] = None
    site: Optional[str] = None
    activity: Optional[str] = None
    report_type: Optional[str] = None  # UA, UC, NearMiss, Incident
    narrative: str


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


class ReportOut(BaseModel):
    id: str
    report_id: str
    site: Optional[str]
    activity: Optional[str]
    report_type: Optional[str]
    sif_flag: Optional[bool]
    sif_probability: Optional[float]
    lsr_tags: List[str] = []

    class Config:
        from_attributes = True


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


# ---------- API Routes ----------
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_report(request: AnalyzeRequest):
    """
    Single report analysis: forwards to AI service, returns combined result.
    """
    import httpx
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{AI_SERVICE_URL}/analyze", json={"narrative": request.narrative})
            resp.raise_for_status()
            return resp.json()
        except httpx.RequestError as e:
            raise HTTPException(503, detail=f"AI service unreachable: {e}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(502, detail=f"AI service error: {e.response.text}")


@app.post("/api/reports/upload")
async def upload_reports(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Bulk CSV upload: parses CSV, stores reports, triggers analysis, returns batch summary.
    """
    import csv
    import io
    from uuid import uuid4

    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files supported")

    content = await file.read()
    try:
        decoded = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(400, "CSV must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(decoded))
    required_cols = {"report_id", "narrative"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        raise HTTPException(400, f"CSV must contain columns: {required_cols}")

    batch_id = uuid4()
    reports_to_insert = []
    for row in reader:
        reports_to_insert.append({
            "report_id": row["report_id"],
            "report_date": row.get("report_date") or None,
            "site": row.get("site") or None,
            "activity": row.get("activity") or None,
            "report_type": row.get("report_type") or None,
            "narrative": row["narrative"],
            "batch_id": batch_id,
        })

    # Bulk insert reports
    if reports_to_insert:
        placeholders = ", ".join([
            "(:report_id, :report_date, :site, :activity, :report_type, :narrative, :batch_id)"
            for _ in reports_to_insert
        ])
        # We'll use SQLAlchemy Core for bulk insert
        from sqlalchemy import insert
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        
        # Simple approach: execute individual inserts
        for r in reports_to_insert:
            db.execute(text("""
                INSERT INTO reports (report_id, report_date, site, activity, report_type, narrative, batch_id)
                VALUES (:report_id, :report_date, :site, :activity, :report_type, :narrative, :batch_id)
                ON CONFLICT (report_id) DO NOTHING
            """), r)
        db.commit()

    return {
        "batch_id": str(batch_id),
        "total_received": len(reports_to_insert),
        "message": "Reports queued. Use /api/reports/analyze-batch to trigger analysis."
    }


@app.post("/api/reports/analyze-batch")
async def analyze_batch(batch_id: str = Form(...), db: Session = Depends(get_db)):
    """
    Trigger analysis for all reports in a batch.
    """
    import httpx
    from uuid import UUID

    # Get unanalyzed reports in batch
    result = db.execute(text("""
        SELECT r.id, r.narrative FROM reports r
        LEFT JOIN classifications c ON c.report_id = r.id
        WHERE r.batch_id = :batch_id AND c.id IS NULL
    """), {"batch_id": UUID(batch_id)})
    reports = result.fetchall()

    if not reports:
        return {"message": "No unanalyzed reports in this batch"}

    analyzed = 0
    async with httpx.AsyncClient(timeout=60.0) as client:
        for r in reports:
            try:
                ai_resp = await client.post(f"{AI_SERVICE_URL}/analyze", json={"narrative": r.narrative})
                ai_resp.raise_for_status()
                ai_data = ai_resp.json()

                # Store classification
                sif = ai_data["sif"]
                db.execute(text("""
                    INSERT INTO classifications (report_id, sif_probability, sif_flag, confidence_level, explanation_snippets)
                    VALUES (:rid, :prob, :flag, :conf, :snippets)
                """), {
                    "rid": r.id, "prob": sif["sif_probability"], "flag": sif["sif_flag"],
                    "conf": sif["confidence_level"], "snippets": ai_data["sif"].get("explanation_snippets", [])
                })

                # Store LSR tags
                for tag in ai_data["lsr_tags"]:
                    db.execute(text("""
                        INSERT INTO lsr_tags (report_id, rule_name, confidence, matched_keywords)
                        VALUES (:rid, :rule, :conf, :kw)
                    """), {"rid": r.id, "rule": tag["rule_name"], "conf": tag["confidence"], "kw": tag["matched_keywords"]})

                # Store entities
                for ent in ai_data["entities"]:
                    db.execute(text("""
                        INSERT INTO entities (report_id, entity_type, entity_value, confidence)
                        VALUES (:rid, :type, :val, :conf)
                    """), {"rid": r.id, "type": ent["entity_type"], "val": ent["entity_value"], "conf": ent["confidence"]})

                analyzed += 1
            except Exception as e:
                print(f"Failed to analyze report {r.id}: {e}")

    db.commit()
    return {"analyzed": analyzed, "batch_id": batch_id}


@app.get("/api/reports", response_model=List[ReportOut])
async def list_reports(
    site: Optional[str] = None,
    sif_only: bool = False,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List reports with optional filters."""
    query = """
        SELECT r.id, r.report_id, r.site, r.activity, r.report_type,
               c.sif_flag, c.sif_probability,
               COALESCE(json_agg(DISTINCT l.rule_name) FILTER (WHERE l.rule_name IS NOT NULL), '[]') as lsr_tags
        FROM reports r
        LEFT JOIN classifications c ON c.report_id = r.id
        LEFT JOIN lsr_tags l ON l.report_id = r.id
        WHERE 1=1
    """
    params = {"limit": limit, "offset": offset}
    if site:
        query += " AND r.site = :site"
        params["site"] = site
    if sif_only:
        query += " AND c.sif_flag = true"
    query += " GROUP BY r.id, r.report_id, r.site, r.activity, r.report_type, c.sif_flag, c.sif_probability"
    query += " ORDER BY r.created_at DESC LIMIT :limit OFFSET :offset"

    result = db.execute(text(query), params)
    return [dict(row) for row in result.mappings()]


@app.get("/api/dashboard/stats")
async def dashboard_stats(db: Session = Depends(get_db)):
    """Dashboard KPI cards."""
    total = db.execute(text("SELECT COUNT(*) FROM reports")).scalar()
    sif_count = db.execute(text("SELECT COUNT(*) FROM classifications WHERE sif_flag = true")).scalar()
    
    # Site ranking
    sites = db.execute(text("""
        SELECT r.site, COUNT(*) as total, 
               SUM(CASE WHEN c.sif_flag THEN 1 ELSE 0 END) as sif_count
        FROM reports r
        LEFT JOIN classifications c ON c.report_id = r.id
        WHERE r.site IS NOT NULL
        GROUP BY r.site
        ORDER BY sif_count DESC
    """)).mappings().all()

    # LSR distribution
    lsr_dist = db.execute(text("""
        SELECT rule_name, COUNT(*) as count
        FROM lsr_tags
        GROUP BY rule_name
        ORDER BY count DESC
    """)).mappings().all()

    # Activity ranking
    activities = db.execute(text("""
        SELECT r.activity, COUNT(*) as total,
               SUM(CASE WHEN c.sif_flag THEN 1 ELSE 0 END) as sif_count
        FROM reports r
        LEFT JOIN classifications c ON c.report_id = r.id
        WHERE r.activity IS NOT NULL
        GROUP BY r.activity
        ORDER BY sif_count DESC
    """)).mappings().all()

    return {
        "total_reports": total,
        "sif_count": sif_count,
        "sif_percentage": round((sif_count / total * 100) if total else 0, 1),
        "sites": [dict(s) for s in sites],
        "lsr_distribution": [dict(l) for l in lsr_dist],
        "activities": [dict(a) for a in activities],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)