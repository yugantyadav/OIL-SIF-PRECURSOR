"""
SIF Precursor Detection - Pydantic Schemas

These define the JSON shapes the API accepts and returns.
Report field names are deliberately mapped to match what the
React frontend (frontend/src/api.js + pages) already expects:

    id, category, description, risk, status, location, date, reportedBy
"""

from typing import Optional, List
from pydantic import BaseModel, Field


# ============================================================
# REPORT SCHEMAS (frontend-facing shape)
# ============================================================

class ReportCreate(BaseModel):
    category: str = Field(..., description="Unsafe Act / Unsafe Condition / Near Miss")
    description: str
    risk: str = "Medium"                 # Critical / High / Medium / Low
    status: str = "Open"                 # Open / Under Review / Resolved
    location: Optional[str] = None
    date: Optional[str] = None           # e.g. "28 August 2026" or "2026-08-28"
    reported_by: Optional[str] = None
    activity: Optional[str] = None


class SIFSummary(BaseModel):
    sif_probability: Optional[float] = None
    sif_flag: Optional[bool] = None
    confidence_level: Optional[str] = None
    explanation_snippets: List[str] = []


class ReportOut(BaseModel):
    id: str
    category: Optional[str] = None
    description: str
    risk: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    date: Optional[str] = None
    reportedBy: Optional[str] = None
    activity: Optional[str] = None
    batch_id: Optional[str] = None
    sif: Optional[SIFSummary] = None


class ReportListOut(BaseModel):
    total: int
    limit: int
    offset: int
    reports: List[ReportOut]


# ============================================================
# ANALYZE (single report -> AI service)
# ============================================================

class AnalyzeRequest(BaseModel):
    narrative: str
    site: Optional[str] = None
    activity: Optional[str] = None
    report_id: Optional[str] = Field(
        None, description="If provided, persist the AI result against this report_id"
    )


# ============================================================
# UPLOAD / BATCH
# ============================================================

class UploadResponse(BaseModel):
    batch_id: str
    filename: str
    total_reports: int
    message: str


class BatchAnalyzeResponse(BaseModel):
    batch_id: str
    total_reports: int
    analyzed: int
    already_analyzed: int
    sif_count: int
    failed: int


# ============================================================
# DASHBOARD
# ============================================================

class DashboardStats(BaseModel):
    total_reports: int
    sif_count: int
    sif_percentage: float
    by_category: dict
    by_risk: dict
    by_status: dict
    by_site: dict
    lsr_counts: dict
