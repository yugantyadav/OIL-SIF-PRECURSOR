import joblib
from pathlib import Path


# ==================================================
# LOAD TRAINED ML MODEL AND VECTORIZER
# ==================================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "ai" / "sif_model.pkl"
VECTORIZER_PATH = BASE_DIR / "ai" / "vectorizer.pkl"

model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)


# ==================================================
# ML SIF PREDICTION
# ==================================================

def predict_sif(report_text):
    """
    Use the trained ML model to predict whether
    a safety report has SIF potential.
    """

    # Convert report text into numerical features
    text_vector = vectorizer.transform([report_text])

    # Predict SIF True or False
    prediction = model.predict(text_vector)[0]

    # Get prediction probabilities
    probabilities = model.predict_proba(text_vector)[0]

    # Highest probability becomes confidence
    confidence = max(probabilities)

    return bool(prediction), round(float(confidence), 4)


# ==================================================
# MAIN SAFETY REPORT ANALYSER
# ==================================================

def analyse_report(report_text):
    """
    Analyse a safety report and return structured
    SIF precursor information.
    """

    # Convert the report to lowercase
    text = report_text.lower()

    # ----------------------------------------------
    # ML SIF PREDICTION
    # ----------------------------------------------

    sif_prediction, ml_confidence = predict_sif(report_text)

    # Default response
    result = {
        "sif_potential": sif_prediction,
        "confidence": ml_confidence,
        "life_saving_rule": "None",
        "activity": "Unknown",
        "location": "Unknown",
        "barrier_failure": "None identified",
        "key_indicators": []
    }

    # ==================================================
    # 1. LIFE-SAVING RULE DETECTION
    # ==================================================

    rules = {
        "Energy Isolation": [
            "lockout",
            "tagout",
            "loto",
            "energized",
            "energised",
            "electrical supply",
            "not isolated",
            "without isolation"
        ],

        "Confined Space": [
            "confined space",
            "tank",
            "vessel",
            "manhole",
            "oxygen",
            "gas testing",
            "gas test"
        ],

        "Working at Height": [
            "working at height",
            "height",
            "scaffold",
            "ladder",
            "roof",
            "harness",
            "fall protection"
        ],

        "Hot Work": [
            "welding",
            "cutting",
            "grinding",
            "sparks",
            "flammable material",
            "combustible material"
        ],

       "Line of Fire": [
    "suspended load",
    "crane",
    "pinch point",
    "struck by",
    "moving equipment",
    "moving machinery",
    "moving machine",
    "rotating equipment",
    "rotating machinery",
    "heavy object"
],

        "Driving and Transportation": [
            "driving",
            "vehicle",
            "truck",
            "speeding",
            "seatbelt"
        ]
    }

    # Find matching Life-Saving Rule
    best_rule = None
    best_matches = []

    for rule, keywords in rules.items():

        matches = []

        for keyword in keywords:
            if keyword in text:
                matches.append(keyword)

        # Keep rule with the highest number of matches
        if len(matches) > len(best_matches):
            best_rule = rule
            best_matches = matches

    # Only assign a Life-Saving Rule if one is found
    if best_rule:
        result["life_saving_rule"] = best_rule
        result["key_indicators"] = best_matches

    # ==================================================
    # 2. ACTIVITY EXTRACTION
    # ==================================================

    activities = {
        "Maintenance": [
            "maintenance",
            "repair",
            "servicing",
            "technician"
        ],

        "Inspection": [
            "inspection",
            "inspecting",
            "checking",
            "checked"
        ],

        "Welding": [
            "welding",
            "welder",
            "weld"
        ],

        "Drilling": [
            "drilling",
            "drill"
        ],

        "Transportation": [
            "driving",
            "transport",
            "truck",
            "vehicle"
        ],

        "Construction": [
            "construction",
            "installation",
            "building"
        ],

        "Lifting": [
            "lifting",
            "crane",
            "hoist",
            "suspended load"
        ]
    }

    for activity, keywords in activities.items():
        if any(keyword in text for keyword in keywords):
            result["activity"] = activity
            break

    # ==================================================
    # 3. LOCATION EXTRACTION
    # ==================================================

    locations = {
        "Tank Area": [
            "tank",
            "storage tank",
            "vessel"
        ],

        "Pump Area": [
            "pump",
            "compressor"
        ],

        "Pipeline Area": [
            "pipeline",
            "pipe"
        ],

        "Workshop": [
            "workshop"
        ],

        "Construction Site": [
            "construction site",
            "building site"
        ],

        "Road / Transport Area": [
            "road",
            "highway"
        ]
    }

    for location, keywords in locations.items():
        if any(keyword in text for keyword in keywords):
            result["location"] = location
            break

    # ==================================================
    # 4. BARRIER FAILURE EXTRACTION
    # ==================================================

    barriers = {
        "Lockout/Tagout not performed": [
            "without lockout",
            "without tagout",
            "without loto",
            "not isolated",
            "without isolation"
        ],

        "Gas testing not performed": [
            "without gas testing",
            "no gas testing",
            "without gas test",
            "oxygen not checked",
            "without checking oxygen"
        ],

        "Fall protection not used": [
            "without harness",
            "no harness",
            "without fall protection"
        ],

        "Permit procedure not followed": [
            "without permit",
            "no permit",
            "permit not followed"
        ],

        "Safety guard missing": [
            "guard missing",
            "safety guard missing"
        ]
    }

    for barrier, keywords in barriers.items():
        if any(keyword in text for keyword in keywords):
            result["barrier_failure"] = barrier
            break

    return result


# ==================================================
# TEST THE HYBRID ANALYSER
# ==================================================

if __name__ == "__main__":

    test_reports = [

        "During maintenance, a technician entered a storage tank without gas testing.",

        "A worker repaired an energized pump without applying lockout tagout.",

        "A worker was welding near flammable materials.",

        "An employee found papers scattered near an office desk.",

        "A worker climbed a ladder without wearing a safety harness.",

        "A worker stood underneath a suspended load."

        "An electrician started repairing a control panel before confirming that the electrical supply was isolated.",

"A worker noticed a small scratch on a desk in the office.",

"Personnel entered a vessel to inspect equipment without first testing the atmosphere for hazardous gases.",

"A technician was positioned near moving machinery while performing maintenance.",

"A driver operated a company vehicle at excessive speed without wearing a seatbelt.",

"A worker was carrying documents between offices during normal operations."
    ]

    for report in test_reports:

        print("\n" + "=" * 60)
        print("REPORT:")
        print(report)

        result = analyse_report(report)

        print("\nANALYSIS:")

        for key, value in result.items():
            print(f"{key}: {value}")
