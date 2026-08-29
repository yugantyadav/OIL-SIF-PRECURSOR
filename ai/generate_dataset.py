"""
Synthetic safety report dataset generator for SIH PS 26165 (Oil & Gas SIF Precursor project).

Generates labeled safety-report-style text across the 6 core Life-Saving Rule
categories (SIF-potential) plus non-SIF categories, with matching structured
labels: sif_potential, life_saving_rule, activity, location, barrier_failure.

Run: python generate_dataset.py
Output: safety_reports.csv
"""

import csv
import random

random.seed(42)

sites = ["Site A", "Site B", "Site C", "Refinery Unit 2", "Terminal 1", "Drilling Pad 7"]

# ---------------------------------------------------------------------------
# SIF-potential categories: each entry is a template + fill-in variations
# ---------------------------------------------------------------------------

sif_categories = {
    "Energy Isolation": {
        "templates": [
            "Technician started {task} on the {equipment} without isolating the {energy_source}.",
            "Worker began {task} on {equipment} before applying lockout/tagout.",
            "{role} opened {equipment} while it was still energized; isolation was not verified.",
            "During {task}, the {energy_source} was not locked out before work began on {equipment}.",
            "{role} removed a guard on {equipment} without confirming zero energy state.",
        ],
        "task": ["maintenance", "repair work", "a pump seal replacement", "electrical work", "valve inspection", "a motor replacement"],
        "equipment": ["compressor", "pump", "electrical panel", "conveyor motor", "hydraulic press", "gas valve assembly"],
        "energy_source": ["electrical supply", "hydraulic pressure", "pneumatic line", "stored mechanical energy"],
        "role": ["Technician", "Contractor", "Maintenance crew", "Operator"],
        "activity": "Maintenance",
        "location": ["Compressor Area", "Pump House", "Electrical Substation", "Motor Room"],
        "barrier_failure": [
            "Isolation not performed",
            "LOTO not applied",
            "Energy source not verified as zero",
            "Lock/tag missing on isolation point",
        ],
    },
    "Confined Space": {
        "templates": [
            "{role} entered the {space} without gas testing.",
            "Worker entered {space} without a valid permit or atmospheric testing.",
            "{role} climbed into {space} to inspect it before oxygen levels were checked.",
            "During {task}, {role} entered {space} without a standby attendant present.",
            "{role} entered {space} despite an expired confined space entry permit.",
        ],
        "task": ["inspection", "cleaning", "maintenance", "tank gauging"],
        "space": ["storage tank", "process vessel", "underground pit", "sewer chamber", "reactor vessel", "ballast tank"],
        "role": ["Worker", "Technician", "Contractor", "Inspector"],
        "activity": ["Maintenance", "Inspection", "Cleaning"],
        "location": ["Tank Area", "Vessel Yard", "Process Unit", "Storage Farm"],
        "barrier_failure": [
            "Atmospheric testing not performed",
            "No standby attendant assigned",
            "Confined space permit not followed",
            "Ventilation not established before entry",
        ],
    },
    "Line of Fire": {
        "templates": [
            "{role} was standing beneath a {load} while it was being lifted.",
            "Worker positioned {position} while {task} was in progress nearby.",
            "{role} walked into the {position} during a lifting operation without warning others.",
            "During {task}, {role} remained in the drop zone of a suspended {load}.",
            "{role} stood in the path of moving {equipment} while it was in operation.",
        ],
        "task": ["a crane lift", "rigging operation", "material handling", "a lifting operation"],
        "load": ["pipe spool", "steel beam", "equipment skid", "load"],
        "position": ["swing radius of the crane", "drop zone", "pinch point area", "path of the forklift"],
        "equipment": ["forklift", "crane", "conveyor", "moving vehicle"],
        "role": ["Worker", "Rigger", "Technician", "Contractor"],
        "activity": ["Lifting Operation", "Material Handling", "Construction"],
        "location": ["Laydown Yard", "Construction Site", "Pipeline Area", "Workshop"],
        "barrier_failure": [
            "Exclusion zone not established",
            "Lifting plan not followed",
            "No spotter assigned",
            "Barricades not in place",
        ],
    },
    "Hot Work": {
        "templates": [
            "{role} performed welding near {hazard} without a hot work permit.",
            "Grinding was carried out close to {hazard} without gas testing beforehand.",
            "{role} began {task} without checking for flammable vapors nearby.",
            "During {task}, sparks were generated near {hazard} with no fire watch present.",
            "{role} conducted {task} without isolating nearby {hazard}.",
        ],
        "task": ["welding", "grinding", "cutting operations", "hot tapping"],
        "hazard": ["combustible material", "flammable storage tanks", "an open fuel line", "process piping containing hydrocarbons"],
        "role": ["Welder", "Contractor", "Technician", "Fabrication crew"],
        "activity": ["Hot Work", "Fabrication", "Repair"],
        "location": ["Workshop", "Pipeline Area", "Tank Farm", "Fabrication Yard"],
        "barrier_failure": [
            "Hot work permit not obtained",
            "Fire watch not assigned",
            "Gas testing not performed before work",
            "Flammable materials not cleared from area",
        ],
    },
    "Working at Height": {
        "templates": [
            "{role} worked on {structure} without wearing a fall arrest harness.",
            "Worker climbed {structure} without securing a lanyard to an anchor point.",
            "{role} used an unsecured ladder to access {structure}.",
            "During {task}, {role} worked at height without edge protection installed.",
            "{role} was found working on {structure} with harness unclipped.",
        ],
        "task": ["roof inspection", "scaffolding work", "structural repair", "cable installation"],
        "structure": ["scaffolding", "elevated platform", "rooftop", "tank roof", "pipe rack"],
        "role": ["Worker", "Contractor", "Technician", "Scaffolder"],
        "activity": ["Construction", "Inspection", "Maintenance"],
        "location": ["Construction Site", "Tank Farm", "Pipe Rack Area", "Workshop"],
        "barrier_failure": [
            "Fall arrest harness not used",
            "Anchor point not secured",
            "Edge protection missing",
            "Ladder not secured before use",
        ],
    },
    "Driving/Transportation": {
        "templates": [
            "{role} was seen using a mobile phone while driving {vehicle} on site.",
            "{role} exceeded the site speed limit while operating {vehicle}.",
            "Driver of {vehicle} was not wearing a seatbelt during transit.",
            "{role} reversed {vehicle} without a banksman present.",
            "{role} operated {vehicle} despite signs of fatigue after a long shift.",
        ],
        "vehicle": ["a light vehicle", "a heavy truck", "a forklift", "a site pickup truck"],
        "role": ["Driver", "Operator", "Contractor", "Employee"],
        "activity": ["Transportation", "Site Driving", "Material Transport"],
        "location": ["Site Access Road", "Internal Roadway", "Loading Bay", "Parking Area"],
        "barrier_failure": [
            "Seatbelt not worn",
            "Mobile phone used while driving",
            "Banksman not used for reversing",
            "Speed limit exceeded",
        ],
    },
}

# ---------------------------------------------------------------------------
# Non-SIF categories
# ---------------------------------------------------------------------------

non_sif_categories = {
    "Housekeeping": {
        "templates": [
            "Loose cables were found lying across the walkway near {location_detail}.",
            "Waste material of type {waste_type} was left unsorted near {location_detail}.",
            "Spilled {spill_item} on the floor near {location_detail} was not cleaned up promptly.",
            "Tools were left scattered on the workbench in {location_detail}.",
            "{item} was stored outside its designated area near {location_detail}.",
            "A walkway near {location_detail} was found partially blocked by empty pallets.",
            "Recyclable material was mixed with general waste near {location_detail}.",
        ],
        "location_detail": ["the office entrance", "the break room", "the main corridor", "the warehouse aisle", "the workshop exit", "the loading dock"],
        "waste_type": ["cardboard", "plastic wrapping", "metal scrap", "packaging material"],
        "spill_item": ["water", "coolant", "a small amount of oil", "cleaning solution"],
        "item": ["A pallet", "An empty drum", "A toolbox", "A spare part crate"],
        "activity": "Housekeeping",
        "location": ["Office", "Warehouse", "Break Room", "Corridor"],
        "barrier_failure": "Minor housekeeping lapse",
    },
    "Office Hazard": {
        "templates": [
            "A {cable_type} cable was found trailing across an office walkway.",
            "An employee reported a {furniture_issue} causing minor discomfort.",
            "A desk drawer near {office_area} was left open, posing a minor trip hazard.",
            "Office lighting in {office_area} was flickering intermittently.",
            "A minor ergonomic complaint was raised regarding the chair setup in {office_area}.",
            "A small stack of files was left on the floor near {office_area}.",
        ],
        "cable_type": ["printer", "monitor", "charging", "network"],
        "furniture_issue": ["loose chair wheel", "wobbly desk leg", "sticking drawer", "worn armrest"],
        "office_area": ["the finance cubicle", "the reception desk", "the meeting room", "the second-floor cubicle row"],
        "activity": "Office Work",
        "location": ["Office", "Admin Building"],
        "barrier_failure": "Minor office hazard, no corrective barrier failure",
    },
    "Low-Risk Observation": {
        "templates": [
            "A minor {stain_type} stain was observed on the {area} floor, no slip occurred.",
            "A worker noted {surface_issue} near the parking area.",
            "A signboard near {area} was found slightly faded and hard to read.",
            "Minor rust was observed on a non-critical handrail near {area}.",
            "A slightly loose floor tile was noted in {area} during a routine walk-through.",
            "A worker suggested improved lighting near {area} for better visibility.",
        ],
        "stain_type": ["oil", "grease", "water", "paint"],
        "area": ["workshop", "loading bay", "yard", "corridor", "storage shed"],
        "surface_issue": ["uneven pavement", "a small pothole", "faded lane markings", "a loose drain cover"],
        "activity": "General Observation",
        "location": ["Workshop", "Parking Area", "Yard"],
        "barrier_failure": "No significant barrier failure identified",
    },
    "Minor PPE Observation": {
        "templates": [
            "{role} was observed not wearing safety glasses during a low-risk desk task.",
            "{role} was found with sleeves rolled up in a low-hazard area.",
            "{role} was seen without a hi-vis vest inside the admin building.",
            "{role} removed gloves briefly while walking to the break room.",
            "{role} was noted wearing open-toed shoes in a non-operational area.",
            "{role} had a hard hat resting on a desk instead of worn, in a low-risk zone.",
        ],
        "role": ["Employee", "Worker", "Staff member", "Visitor", "Contractor"],
        "activity": ["General Duty", "Admin Task"],
        "location": ["Admin Building", "Office", "Break Room"],
        "barrier_failure": "Minor PPE non-compliance, low risk context",
    },
}


def fill_template(template, options):
    """Fill a template string with a random choice from each {placeholder}."""
    result = template
    for key, choices in options.items():
        placeholder = "{" + key + "}"
        if placeholder in result:
            result = result.replace(placeholder, random.choice(choices) if isinstance(choices, list) else choices, 1)
    return result


def pick(value):
    return random.choice(value) if isinstance(value, list) else value


def generate_sif_row(rule_name, cfg):
    template = random.choice(cfg["templates"])
    text = fill_template(template, cfg)
    confidence = round(random.uniform(0.82, 0.98), 2)
    return {
        "report_text": text,
        "sif_potential": True,
        "confidence": confidence,
        "life_saving_rule": rule_name,
        "activity": pick(cfg["activity"]),
        "location": pick(cfg["location"]),
        "barrier_failure": pick(cfg["barrier_failure"]),
        "site": random.choice(sites),
    }


def generate_non_sif_row(category_name, cfg):
    template = random.choice(cfg["templates"])
    text = fill_template(template, cfg)
    confidence = round(random.uniform(0.75, 0.95), 2)
    return {
        "report_text": text,
        "sif_potential": False,
        "confidence": confidence,
        "life_saving_rule": "None",
        "activity": pick(cfg["activity"]),
        "location": pick(cfg["location"]),
        "barrier_failure": pick(cfg["barrier_failure"]),
        "site": random.choice(sites),
    }


def main(total_rows=300, sif_ratio=0.65):
    rows = []
    n_sif = int(total_rows * sif_ratio)
    n_non_sif = total_rows - n_sif

    sif_names = list(sif_categories.keys())
    for i in range(n_sif):
        rule_name = sif_names[i % len(sif_names)]
        rows.append(generate_sif_row(rule_name, sif_categories[rule_name]))

    non_sif_names = list(non_sif_categories.keys())
    for i in range(n_non_sif):
        cat_name = non_sif_names[i % len(non_sif_names)]
        rows.append(generate_non_sif_row(cat_name, non_sif_categories[cat_name]))

    random.shuffle(rows)

    # Deduplicate exact text repeats while preserving order
    seen = set()
    deduped = []
    for r in rows:
        if r["report_text"] not in seen:
            seen.add(r["report_text"])
            deduped.append(r)

    fieldnames = [
        "id", "report_text", "sif_potential", "confidence",
        "life_saving_rule", "activity", "location", "barrier_failure", "site",
    ]

    with open("safety_reports.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for idx, row in enumerate(deduped, start=1001):
            row_out = {"id": idx, **row}
            writer.writerow(row_out)

    print(f"Generated {len(deduped)} unique rows -> safety_reports.csv")
    print(f"SIF: {sum(1 for r in deduped if r['sif_potential'])}, Non-SIF: {sum(1 for r in deduped if not r['sif_potential'])}")


if __name__ == "__main__":
    main(total_rows=400, sif_ratio=0.6)
