"""Seed DB with 50 sample reports for demo"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from database import SessionLocal, Base, engine
import models
from datetime import datetime

# import initialReports from frontend data would be duplicated; keep minimal inline seed
SEED = [
  ("R-001","Unsafe Act","Worker entered restricted area without PPE","Critical","Open","Drilling Site - Zone A","28 August 2026","Safety Officer"),
  ("R-002","Near Miss","Oil leakage detected near drilling equipment","High","Under Review","Refinery - Unit B","27 August 2026","Site Supervisor"),
  ("R-003","Unsafe Condition","Damaged safety railing observed","Medium","Resolved","Pipeline - Sector C","26 August 2026","Maintenance Engineer"),
  ("R-004","Near Miss","Vehicle nearly collided with pedestrian","High","Open","Central Workshop","25 August 2026","Safety Officer"),
  ("R-005","Unsafe Act","Operator failed to wear required safety helmet","High","Open","Drilling Site - Zone A","24 August 2026","Site Supervisor"),
]

# Fallback: generate 50 by reusing pattern if file not imported
try:
    import json, pathlib
    p = pathlib.Path(__file__).parent.parent / "frontend" / "src" / "data" / "reportsData.js"
    if p.exists():
        txt = p.read_text()
        # quick extract JSON array
        import re
        m = re.search(r"export const initialReports = (\[.*?\]);", txt, re.DOTALL)
        if m:
            import json5  # may not exist, fallback
            pass
except:
    pass

def parse_date(s):
    for fmt in ("%d %B %Y","%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except:
            continue
    return None

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Report).count() > 0:
            print(f"Already seeded: {db.query(models.Report).count()} reports")
            return
        # try to load frontend reportsData via python translation (simple exec of JS-like)
        import pathlib, re
        js_path = pathlib.Path(__file__).parent.parent / "frontend" / "src" / "data" / "reportsData.js"
        reports = []
        if js_path.exists():
            content = js_path.read_text()
            # extract objects between { and }
            objs = re.findall(r"\{\s*id:\s*\"([^\"]+)\".*?category:\s*\"([^\"]+)\".*?description:\s*\"([^\"]+)\".*?risk:\s*\"([^\"]+)\".*?status:\s*\"([^\"]+)\".*?location:\s*\"([^\"]+)\".*?date:\s*\"([^\"]+)\".*?reportedBy:\s*\"([^\"]+)\"", content, re.DOTALL)
            for o in objs:
                reports.append(o)
        if not reports:
            reports = SEED
        for r in reports:
            rid, cat, desc, risk, status, loc, dstr, rep = r
            db.add(models.Report(
                report_id=rid, report_type=cat, narrative=desc, risk=risk, status=status,
                site=loc, report_date=parse_date(dstr), reported_by=rep, activity=cat
            ))
        db.commit()
        print(f"Seeded {len(reports)} reports")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
