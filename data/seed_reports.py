#!/usr/bin/env python3
"""
Generate synthetic OIL-style UA/UC/Near-Miss reports for demo.
Run: python data/seed_reports.py
Outputs: data/safety_reports.csv
"""
import csv
import random
from datetime import datetime, timedelta

# TODO: Implement with Faker library
# pip install faker

SITES = [
    "Drill Site #1", "Drill Site #3", "Drill Site #7", "Drill Site #12", "Drill Site #15",
    "GGS-I Duliajan", "GGS-II Duliajan", "GGS-III Naharkatiya", "GGS-IV Moran",
    "Pipeline ROW Duliajan-Madhuban", "Pipeline ROW Moran-Naharkatiya",
    "Oil Tank Farm Duliajan", "LPG Bottling Plant", "ETP Duliajan",
]

ACTIVITIES = [
    "Drilling operations", "Workover operations", "Well testing", "Cementing",
    "Tubing replacement", "Pump maintenance", "Valve replacement", "Flange breaking",
    "Tank cleaning", "Confined space entry", "Hot work - welding", "Hot work - cutting",
    "Scaffold erection", "Working at height", "Crane lifting", "Rigging operations",
]

REPORT_TYPES = ["UA", "UC", "NearMiss", "Incident"]

def main():
    print("TODO: Implement synthetic data generation")
    print("Output: data/safety_reports.csv")
    print("Columns: report_id, report_date, site, activity, report_type, narrative")
    print("Target: ~600 reports, ~25% SIF-potential scenarios")

if __name__ == "__main__":
    main()