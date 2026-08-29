import joblib
from pathlib import Path

# Resolve model paths relative to this file — works both locally (project root) and in Docker (WORKDIR /app)
_this = Path(__file__).resolve()
for candidate in [_this.parent / "sif_model.pkl", _this.parent.parent / "ai" / "sif_model.pkl"]:
    if candidate.exists():
        MODEL_PATH = candidate
        break
else:
    MODEL_PATH = _this.parent / "sif_model.pkl"

for candidate in [_this.parent / "vectorizer.pkl", _this.parent.parent / "ai" / "vectorizer.pkl"]:
    if candidate.exists():
        VECTORIZER_PATH = candidate
        break
else:
    VECTORIZER_PATH = _this.parent / "vectorizer.pkl"

_model = None
_vectorizer = None

def _ensure_loaded():
    global _model, _vectorizer
    if _model is None or _vectorizer is None:
        _model = joblib.load(MODEL_PATH)
        _vectorizer = joblib.load(VECTORIZER_PATH)

def predict_sif(report_text):
    _ensure_loaded()
    text_vector = _vectorizer.transform([report_text])
    prediction = _model.predict(text_vector)[0]
    probabilities = _model.predict_proba(text_vector)[0]
    confidence = max(probabilities)
    return bool(prediction), round(float(confidence), 4)

def analyse_report(report_text):
    text = report_text.lower()
    sif_prediction, ml_confidence = predict_sif(report_text)
    result = {
        "sif_potential": sif_prediction,
        "confidence": ml_confidence,
        "life_saving_rule": "None",
        "activity": "Unknown",
        "location": "Unknown",
        "barrier_failure": "None identified",
        "key_indicators": []
    }
    rules = {
        "Energy Isolation": ["lockout","tagout","loto","energized","energised","electrical supply","not isolated","without isolation"],
        "Confined Space": ["confined space","tank","vessel","manhole","oxygen","gas testing","gas test"],
        "Working at Height": ["working at height","height","scaffold","ladder","roof","harness","fall protection"],
        "Hot Work": ["welding","cutting","grinding","sparks","flammable material","combustible material"],
        "Line of Fire": ["suspended load","crane","pinch point","struck by","moving equipment","moving machinery","moving machine","rotating equipment","rotating machinery","heavy object"],
        "Driving and Transportation": ["driving","vehicle","truck","speeding","seatbelt"]
    }
    best_rule = None
    best_matches = []
    for rule, keywords in rules.items():
        matches = [k for k in keywords if k in text]
        if len(matches) > len(best_matches):
            best_rule = rule
            best_matches = matches
    if best_rule:
        result["life_saving_rule"] = best_rule
        result["key_indicators"] = best_matches
    activities = {
        "Maintenance": ["maintenance","repair","servicing","technician"],
        "Inspection": ["inspection","inspecting","checking","checked"],
        "Welding": ["welding","welder","weld"],
        "Drilling": ["drilling","drill"],
        "Transportation": ["driving","transport","truck","vehicle"],
        "Construction": ["construction","installation","building"],
        "Lifting": ["lifting","crane","hoist","suspended load"]
    }
    for activity, keywords in activities.items():
        if any(k in text for k in keywords):
            result["activity"] = activity
            break
    locations = {
        "Tank Area": ["tank","storage tank","vessel"],
        "Pump Area": ["pump","compressor"],
        "Pipeline Area": ["pipeline","pipe"],
        "Workshop": ["workshop"],
        "Construction Site": ["construction site","building site"],
        "Road / Transport Area": ["road","highway"]
    }
    for location, keywords in locations.items():
        if any(k in text for k in keywords):
            result["location"] = location
            break
    barriers = {
        "Lockout/Tagout not performed": ["without lockout","without tagout","without loto","not isolated","without isolation"],
        "Gas testing not performed": ["without gas testing","no gas testing","without gas test","oxygen not checked","without checking oxygen"],
        "Fall protection not used": ["without harness","no harness","without fall protection"],
        "Permit procedure not followed": ["without permit","no permit","permit not followed"],
        "Safety guard missing": ["guard missing","safety guard missing"]
    }
    for barrier, keywords in barriers.items():
        if any(k in text for k in keywords):
            result["barrier_failure"] = barrier
            break
    return result

if __name__ == "__main__":
    test_reports = [
        "During maintenance, a technician entered a storage tank without gas testing.",
        "A worker repaired an energized pump without applying lockout tagout.",
        "A worker was welding near flammable materials.",
        "An employee found papers scattered near an office desk.",
        "A worker climbed a ladder without wearing a safety harness.",
        "A worker stood underneath a suspended load.",
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
