#!/usr/bin/env python3
"""
Generate synthetic OIL-style UA/UC/Near-Miss reports for demo.
Run: python data/seed_reports.py
Outputs: data/safety_reports.csv
"""
import csv
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)

# OIL-specific sites
SITES = [
    "Drill Site #1", "Drill Site #3", "Drill Site #7", "Drill Site #12", "Drill Site #15",
    "Drill Site #19", "Drill Site #23", "Drill Site #28", "Drill Site #31",
    "GGS-I Duliajan", "GGS-II Duliajan", "GGS-III Naharkatiya", "GGS-IV Moran",
    "Pipeline ROW Duliajan-Madhuban", "Pipeline ROW Moran-Naharkatiya",
    "Oil Tank Farm Duliajan", "LPG Bottling Plant", "ETP Duliajan",
    "Rajshree Field", "Hapjan Field", "Chandmari Field",
]

ACTIVITIES = [
    "Drilling operations", "Workover operations", "Well testing", "Cementing",
    "Tubing replacement", "Pump maintenance", "Valve replacement", "Flange breaking",
    "Tank cleaning", "Confined space entry", "Hot work - welding", "Hot work - cutting",
    "Scaffold erection", "Working at height", "Crane lifting", "Rigging operations",
    "Chemical handling", "H2S area work", "Pressure testing", "Pipeline pigging",
    "Excavation", "Vehicle operation", "Forklift operation", "Electrical maintenance",
    "Instrument calibration", "Pig launcher/receiver ops",
]

REPORT_TYPES = ["UA", "UC", "NearMiss", "Incident"]

# SIF-potential scenarios (~25%)
SIF_SCENARIOS = [
    {
        "template": "Worker entered {equipment} without gas testing. Oxygen level not verified. No confined space permit obtained. H2S smell detected.",
        "site_type": ["GGS", "Tank Farm", "ETP"],
        "activity": "Confined space entry",
        "sif": True,
        "lsr": ["Confined Space", "Energy Isolation", "Work Authorisation"],
    },
    {
        "template": "Mechanic started {equipment} maintenance without lockout-tagout. Isolation certificate not verified. Stored pressure in discharge line.",
        "site_type": ["Drill Site", "GGS", "Pipeline"],
        "activity": "Pump maintenance",
        "sif": True,
        "lsr": ["Energy Isolation", "Work Authorisation"],
    },
    {
        "template": "Rigger positioned under suspended load during {activity}. Crane operator unaware. Load shifted unexpectedly. Near miss.",
        "site_type": ["Drill Site", "Pipeline", "Tank Farm"],
        "activity": "Valve replacement",
        "sif": True,
        "lsr": ["Line of Fire", "Safe Mechanical Lifting"],
    },
    {
        "template": "Welder performing hot work on {equipment} without fire watch. Flammable material not cleared. Hot work permit expired.",
        "site_type": ["Drill Site", "GGS", "Pipeline"],
        "activity": "Hot work - welding",
        "sif": True,
        "lsr": ["Hot Work", "Work Authorisation", "Line of Fire"],
    },
    {
        "template": "Scaffold collapsed at {height}m during {activity}. Guardrails missing. Workers not wearing fall arrest harnesses.",
        "site_type": ["Drill Site", "GGS", "Tank Farm"],
        "activity": "Scaffold erection",
        "sif": True,
        "lsr": ["Working at Height", "Work Authorisation"],
    },
    {
        "template": "Forklift reversed into pedestrian walkway at {site}. No spotter. Backup alarm not functioning. Near miss with operator.",
        "site_type": ["GGS", "Tank Farm", "Pipeline"],
        "activity": "Forklift operation",
        "sif": True,
        "lsr": ["Driving", "Line of Fire"],
    },
    {
        "template": "Excavation wall collapsed at {site}. Shoring not installed. Workers in trench. No permit for excavation >1.5m.",
        "site_type": ["Pipeline", "Drill Site"],
        "activity": "Excavation",
        "sif": True,
        "lsr": ["Work Authorisation", "Line of Fire"],
    },
    {
        "template": "H2S release from {equipment} during {activity}. Gas detectors not calibrated. Workers without SCBA. Emergency response delayed.",
        "site_type": ["GGS", "Drill Site", "ETP"],
        "activity": "H2S area work",
        "sif": True,
        "lsr": ["Confined Space", "Energy Isolation", "Work Authorisation"],
    },
    {
        "template": "High-pressure line ruptured during {activity}. Pressure not bled. Relief valve blocked. Worker struck by debris.",
        "site_type": ["Drill Site", "GGS", "Pipeline"],
        "activity": "Pressure testing",
        "sif": True,
        "lsr": ["Energy Isolation", "Line of Fire", "Work Authorisation"],
    },
    {
        "template": "Dropped object from height during {activity}. Tool lanyard not used. Exclusion zone not established. Near miss to personnel below.",
        "site_type": ["Drill Site", "GGS", "Tank Farm"],
        "activity": "Working at height",
        "sif": True,
        "lsr": ["Working at Height", "Line of Fire", "Safe Mechanical Lifting"],
    },
]

# Non-SIF scenarios (~75%)
NON_SIF_SCENARIOS = [
    {
        "template": "Housekeeping inspection found oil spill near {equipment}. Cleaned immediately. No injury.",
        "sif": False,
        "lsr": [],
    },
    {
        "template": "PPE compliance check: all workers wearing required PPE at {site}. Good practice observed.",
        "sif": False,
        "lsr": [],
    },
    {
        "template": "Minor leak detected on {equipment} flange. Contained with drip tray. Maintenance notified.",
        "sif": False,
        "lsr": [],
    },
    {
        "template": "Scaffold inspection completed at {site}. All guardrails and toe boards in place. Tagged green.",
        "sif": False,
        "lsr": [],
    },
    {
        "template": "Fire extinguisher inspection at {site}. All units charged and accessible. No deficiencies.",
        "sif": False,
        "lsr": [],
    },
    {
        "template": "Toolbox talk conducted on {activity} hazards. All attendees signed attendance. No issues raised.",
        "sif": False,
        "lsr": [],
    },
    {
        "template": "First aid case: minor cut on finger during {activity}. Treated on site. Returned to work.",
        "sif": False,
        "lsr": [],
    },
    {
        "template": "Vehicle pre-start check completed. All lights, brakes, horn functional. No defects found.",
        "sif": False,
        "lsr": [],
    },
    {
        "template": "Permit to work issued for {activity}. All isolations verified. Gas test clear. Work proceeded safely.",
        "sif": False,
        "lsr": ["Work Authorisation", "Energy Isolation", "Confined Space"],
    },
    {
        "template": "Emergency drill conducted at {site}. Muster time within target. All personnel accounted for.",
        "sif": False,
        "lsr": [],
    },
    {
        "template": "Lifting plan reviewed for {activity}. Load chart verified. Crane certified. Lift completed safely.",
        "sif": False,
        "lsr": ["Safe Mechanical Lifting"],
    },
    {
        "template": "Confined space entry for {equipment} inspection. Gas test clear. Permit valid. Standby person present.",
        "sif": False,
        "lsr": ["Confined Space", "Work Authorisation"],
    },
    {
        "template": "Hot work permit for {activity}. Fire watch assigned. Area cleared of flammables. Work completed without incident.",
        "sif": False,
        "lsr": ["Hot Work", "Work Authorisation"],
    },
    {
        "template": "Working at height on {equipment}. Fall protection worn. Anchor points certified. No issues.",
        "sif": False,
        "lsr": ["Working at Height"],
    },
    {
        "template": "Routine inspection of {equipment}. No abnormalities found. Next inspection scheduled.",
        "sif": False,
        "lsr": [],
    },
]

EQUIPMENT = [
    "Pump P-101", "Pump P-205", "Compressor C-301", "Separator V-402",
    "Heater Treater HT-501", "Storage Tank T-101", "Storage Tank T-203",
    "Pipeline PL-12", "Pipeline PL-45", "Wellhead WH-07", "Wellhead WH-19",
    "Manifold M-03", "Dehydration Unit DU-01", "Desalter DS-02",
    "Flare Stack FS-01", "Boiler B-01", "Air Compressor AC-04",
]

def pick_site(site_type):
    matching = [s for s in SITES if any(t in s for t in site_type)]
    return random.choice(matching) if matching else random.choice(SITES)

def generate_report(i, total):
    # ~25% SIF
    if i < total * 0.25:
        scenario = random.choice(SIF_SCENARIOS)
    else:
        scenario = random.choice(NON_SIF_SCENARIOS)

    site = pick_site(scenario.get("site_type", ["Drill Site"]))
    activity = scenario.get("activity", random.choice(ACTIVITIES))
    equipment = random.choice(EQUIPMENT)

    narrative = scenario["template"].format(
        equipment=equipment,
        site=site,
        activity=activity,
        height=random.randint(3, 15),
    )

    # Add some variation
    if random.random() < 0.3:
        narrative += f" Reported by {fake.name()}. "
    if random.random() < 0.2:
        narrative += f" Weather: {random.choice(['clear', 'rainy', 'foggy', 'windy'])}. "

    return {
        "report_id": f"OIL-{datetime.now().year}-{random.randint(10000, 99999)}",
        "report_date": (datetime.now() - timedelta(days=random.randint(0, 90))).strftime("%Y-%m-%d"),
        "site": site,
        "activity": activity,
        "report_type": random.choice(REPORT_TYPES),
        "narrative": narrative,
    }

def main():
    total = 600  # generous demo dataset
    reports = [generate_report(i, total) for i in range(total)]

    output_path = "data/safety_reports.csv"
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["report_id", "report_date", "site", "activity", "report_type", "narrative"])
        writer.writeheader()
        writer.writerows(reports)

    sif_count = sum(1 for r in reports if any(kw in r["narrative"].lower() for kw in
        ["without gas testing", "without lockout-tagout", "suspended load", "without fire watch",
         "guardrails missing", "no spotter", "shoring not", "gas detectors not", "pressure not bled",
         "tool lanyard not"]))
    print(f"Generated {total} reports → {output_path}")
    print(f"Estimated SIF-potential: {sif_count} ({sif_count/total*100:.1f}%)")

if __name__ == "__main__":
    main()