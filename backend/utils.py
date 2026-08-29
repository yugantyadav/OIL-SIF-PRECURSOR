"""
Small helpers shared across the backend:
- date parsing/formatting (frontend uses "28 August 2026" style strings)
- report_id generation (R-001, R-002, ...)
"""

import re
from datetime import date, datetime
from typing import Optional

from sqlalchemy.orm import Session

import models

_DATE_FORMATS = (
    "%d %B %Y", "%d %b %Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y",
    "%b %d %Y", "%B %d %Y", "%d-%b-%Y", "%Y/%m/%d",
)

def parse_date(value: Optional[str]) -> Optional[date]:
    """Parse a date string coming from the frontend/CSV into a date object."""
    if not value:
        return None
    value = value.strip()
    # try strict formats first (title-cased for %B/%b)
    for fmt in _DATE_FORMATS:
        for cand in (value, value.title()):
            try:
                return datetime.strptime(cand, fmt).date()
            except ValueError:
                continue
    # fallback: dateutil if available (handles ISO, locale, etc.)
    try:
        from dateutil import parser as du_parser
        return du_parser.parse(value, dayfirst=True).date()
    except Exception:
        return None


def format_date(value: Optional[date]) -> Optional[str]:
    """Format a date object back into the '28 August 2026' style the UI uses."""
    if value is None:
        return None
    return value.strftime("%d %B %Y")


def highest_report_number(db: Session) -> int:
    """Return the highest numeric suffix currently used across report_ids."""
    reports = db.query(models.Report.report_id).all()
    max_num = 0
    for (rid,) in reports:
        if not rid:
            continue
        m = re.search(r"(\d+)$", rid)
        if m:
            max_num = max(max_num, int(m.group(1)))
    return max_num


def next_report_id(db: Session) -> str:
    """Generate the next sequential report id, e.g. R-051.

    Note: because the session may use autoflush=False, this only reflects
    rows already committed/flushed. For bulk creation of many rows in one
    request, compute the starting number once and increment in memory
    instead of calling this per-row (see crud.bulk_create_reports).
    """
    return f"R-{highest_report_number(db) + 1:03d}"
