"""
Seed the database with demo reports so the frontend/dashboard has data
to show immediately. Reuses the same 50 sample rows baked into
frontend/src/data/reportsData.js so the demo data is consistent
everywhere, with a small built-in fallback if that file can't be found.
"""
import os
import re
import sys
import pathlib

sys.path.insert(0, os.path.dirname(__file__))

from database import Base, engine, SessionLocal  # noqa: E402
import models  # noqa: E402
import utils  # noqa: E402

FALLBACK_SEED = [
    ("R-001", "Unsafe Act", "Worker entered restricted area without PPE", "Critical", "Open", "Drilling Site - Zone A", "28 August 2026", "Safety Officer"),
    ("R-002", "Near Miss", "Oil leakage detected near drilling equipment", "High", "Under Review", "Refinery - Unit B", "27 August 2026", "Site Supervisor"),
    ("R-003", "Unsafe Condition", "Damaged safety railing observed", "Medium", "Resolved", "Pipeline - Sector C", "26 August 2026", "Maintenance Engineer"),
    ("R-004", "Near Miss", "Vehicle nearly collided with pedestrian", "High", "Open", "Central Workshop", "25 August 2026", "Safety Officer"),
    ("R-005", "Unsafe Act", "Operator failed to wear required safety helmet", "High", "Open", "Drilling Site - Zone A", "24 August 2026", "Site Supervisor"),
]

ROW_RE = re.compile(
    r'id:\s*"(?P<id>[^"]+)"\s*,\s*category:\s*"(?P<category>[^"]+)"\s*,\s*'
    r'description:\s*"(?P<description>[^"]+)"\s*,\s*risk:\s*"(?P<risk>[^"]+)"\s*,\s*'
    r'status:\s*"(?P<status>[^"]+)"\s*,\s*location:\s*"(?P<location>[^"]+)"\s*,\s*'
    r'date:\s*"(?P<date>[^"]+)"\s*,\s*reportedBy:\s*"(?P<reportedBy>[^"]+)"'
)


def load_frontend_rows():
    js_path = pathlib.Path(__file__).parent.parent / "frontend" / "src" / "data" / "reportsData.js"
    if not js_path.exists():
        return None

    content = js_path.read_text(encoding="utf-8")
    matches = ROW_RE.finditer(content)
    rows = [
        (m["id"], m["category"], m["description"], m["risk"], m["status"], m["location"], m["date"], m["reportedBy"])
        for m in matches
    ]
    return rows or None


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(models.Report).count()
        if existing > 0:
            print(f"Already seeded: {existing} reports present, skipping.")
            return

        rows = load_frontend_rows() or FALLBACK_SEED

        for report_id, category, description, risk, status, location, date_str, reported_by in rows:
            db.add(models.Report(
                report_id=report_id,
                report_type=category,
                narrative=description,
                risk=risk,
                status=status,
                site=location,
                report_date=utils.parse_date(date_str),
                reported_by=reported_by,
                activity=category,
            ))

        db.commit()
        print(f"Seeded {len(rows)} reports.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
