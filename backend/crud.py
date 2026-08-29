"""
SIF Precursor Detection - CRUD layer

All direct SQLAlchemy query logic lives here, keeping main.py focused on
HTTP routing/orchestration.
"""

import json
import uuid
from typing import Optional, List

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

import models
import schemas
import utils


# ============================================================
# SERIALIZATION (DB model -> frontend-shaped dict)
# ============================================================

def report_to_out(report: models.Report) -> schemas.ReportOut:
    sif = None
    if report.classifications:
        latest = sorted(report.classifications, key=lambda c: c.created_at or 0)[-1]
        try:
            snippets = json.loads(latest.explanation_snippets) if latest.explanation_snippets else []
        except (TypeError, ValueError):
            snippets = []
        sif = schemas.SIFSummary(
            sif_probability=latest.sif_probability,
            sif_flag=latest.sif_flag,
            confidence_level=latest.confidence_level,
            explanation_snippets=snippets,
        )

    return schemas.ReportOut(
        id=report.report_id,
        category=report.report_type,
        description=report.narrative,
        risk=report.risk,
        status=report.status,
        location=report.site,
        date=utils.format_date(report.report_date),
        reportedBy=report.reported_by,
        activity=report.activity,
        batch_id=report.batch_id,
        sif=sif,
    )


# ============================================================
# CREATE
# ============================================================

def create_report(db: Session, payload: schemas.ReportCreate, batch_id: Optional[str] = None) -> models.Report:
    report = models.Report(
        report_id=utils.next_report_id(db),
        report_date=utils.parse_date(payload.date) or None,
        site=payload.location,
        activity=payload.activity or payload.category,
        report_type=payload.category,
        risk=payload.risk,
        status=payload.status,
        reported_by=payload.reported_by,
        narrative=payload.description,
        batch_id=batch_id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


# ============================================================
# READ
# ============================================================

def get_report(db: Session, report_id: str) -> Optional[models.Report]:
    """Look up a report by its business id (e.g. 'R-001'), the id shown in the UI/URL."""
    return (
        db.query(models.Report)
        .options(joinedload(models.Report.classifications))
        .filter(models.Report.report_id == report_id)
        .first()
    )


def list_reports(
    db: Session,
    site: Optional[str] = None,
    category: Optional[str] = None,
    risk: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sif_only: bool = False,
    batch_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    query = db.query(models.Report).options(joinedload(models.Report.classifications))

    if site:
        query = query.filter(models.Report.site == site)
    if category:
        query = query.filter(models.Report.report_type == category)
    if risk:
        query = query.filter(models.Report.risk == risk)
    if status:
        query = query.filter(models.Report.status == status)
    if batch_id:
        query = query.filter(models.Report.batch_id == batch_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                models.Report.narrative.ilike(like) if hasattr(models.Report.narrative, "ilike") else models.Report.narrative.like(like),
                models.Report.report_id.like(like),
                models.Report.site.like(like),
            )
        )
    if sif_only:
        query = query.join(models.Classification).filter(models.Classification.sif_flag.is_(True))

    total = query.distinct().count()

    reports = (
        query.order_by(models.Report.created_at.desc())
        .distinct()
        .offset(offset)
        .limit(limit)
        .all()
    )

    return total, reports


# ============================================================
# BATCH / CSV UPLOAD
# ============================================================

def create_batch(db: Session, filename: str, total_reports: int) -> models.Batch:
    batch = models.Batch(
        id=str(uuid.uuid4()),
        filename=filename,
        total_reports=total_reports,
        sif_count=0,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


def bulk_create_reports(db: Session, rows: List[dict], batch_id: str) -> int:
    created = 0

    # Track ids in-memory rather than re-querying per row: the session's
    # autoflush is off, so newly-added-but-uncommitted rows in this same
    # loop wouldn't otherwise be visible to a fresh query and could collide.
    existing_ids = {rid for (rid,) in db.query(models.Report.report_id).all() if rid}
    next_num = utils.highest_report_number(db) + 1

    for row in rows:
        report_id = row.get("report_id")
        if not report_id or report_id in existing_ids:
            report_id = f"R-{next_num:03d}"
            next_num += 1
        existing_ids.add(report_id)

        report = models.Report(
            report_id=report_id,
            report_date=utils.parse_date(row.get("date") or row.get("report_date")),
            site=row.get("location") or row.get("site"),
            activity=row.get("activity"),
            report_type=row.get("category") or row.get("report_type"),
            risk=row.get("risk"),
            status=row.get("status") or "Open",
            reported_by=row.get("reportedBy") or row.get("reported_by"),
            narrative=row.get("description") or row.get("narrative") or "",
            batch_id=batch_id,
        )
        if not report.narrative.strip():
            continue
        db.add(report)
        created += 1
    db.commit()
    return created


def get_batch(db: Session, batch_id: str) -> Optional[models.Batch]:
    return db.query(models.Batch).filter(models.Batch.id == batch_id).first()


def reports_pending_analysis(db: Session, batch_id: str) -> List[models.Report]:
    return (
        db.query(models.Report)
        .outerjoin(models.Classification)
        .filter(models.Report.batch_id == batch_id)
        .filter(models.Classification.id.is_(None))
        .all()
    )


# ============================================================
# SAVE AI RESULT
# ============================================================

def save_ai_result(db: Session, report: models.Report, ai_response: dict) -> models.Classification:
    sif = ai_response.get("sif", {})

    classification = models.Classification(
        report_id=report.id,
        sif_probability=sif.get("sif_probability", 0.0),
        sif_flag=bool(sif.get("sif_flag", False)),
        confidence_level=sif.get("confidence_level"),
        model_version="hybrid-v1",
        explanation_snippets=json.dumps(sif.get("explanation_snippets", [])),
    )
    db.add(classification)

    for tag in ai_response.get("lsr_tags", []):
        db.add(models.LSRTag(
            report_id=report.id,
            rule_name=tag.get("rule_name"),
            confidence=tag.get("confidence"),
            matched_keywords=json.dumps(tag.get("matched_keywords", [])),
        ))

    for entity in ai_response.get("entities", []):
        db.add(models.Entity(
            report_id=report.id,
            entity_type=entity.get("entity_type"),
            entity_value=entity.get("entity_value"),
            confidence=entity.get("confidence"),
        ))

    db.commit()
    db.refresh(classification)
    return classification


# ============================================================
# DASHBOARD AGGREGATES
# ============================================================

def dashboard_stats(db: Session) -> schemas.DashboardStats:
    total_reports = db.query(func.count(models.Report.id)).scalar() or 0

    def counts(column):
        rows = (
            db.query(column, func.count(models.Report.id))
            .group_by(column)
            .all()
        )
        return {key: count for key, count in rows if key}

    by_category = counts(models.Report.report_type)
    by_risk = counts(models.Report.risk)
    by_status = counts(models.Report.status)
    by_site = counts(models.Report.site)

    sif_count = (
        db.query(func.count(func.distinct(models.Classification.report_id)))
        .filter(models.Classification.sif_flag.is_(True))
        .scalar()
        or 0
    )

    lsr_rows = (
        db.query(models.LSRTag.rule_name, func.count(models.LSRTag.id))
        .group_by(models.LSRTag.rule_name)
        .all()
    )
    lsr_counts = {name: count for name, count in lsr_rows if name}

    sif_percentage = round((sif_count / total_reports) * 100, 2) if total_reports else 0.0

    return schemas.DashboardStats(
        total_reports=total_reports,
        sif_count=sif_count,
        sif_percentage=sif_percentage,
        by_category=by_category,
        by_risk=by_risk,
        by_status=by_status,
        by_site=by_site,
        lsr_counts=lsr_counts,
    )
