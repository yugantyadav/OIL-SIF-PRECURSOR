import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function AIPrediction() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefilled = location.state?.narrative || "";
  const fromReport = !!location.state?.narrative;
  const reportId = location.state?.reportId || null;

  const [reportText, setReportText] = useState(prefilled);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prefilled) setReportText(prefilled);
  }, [prefilled]);

  const analyzeReport = async () => {
    if (!reportText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: reportText, report_id: reportId || undefined }),
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      const sif = data.sif || {};
      const prob = Math.round((sif.sif_probability || 0) * 100);
      let risk = "Low";
      if (prob >= 75) risk = "Critical";
      else if (prob >= 60) risk = "High";
      else if (prob >= 35) risk = "Medium";

      const precursors = [
        ...(sif.explanation_snippets || []),
        ...(data.lsr_tags || []).map((t) => `${t.rule_name} — ${t.matched_keywords?.join(", ")}`),
        ...(data.entities || []).map((e) => `${e.entity_type}: ${e.entity_value}`),
      ].filter(Boolean);

      const explanation = sif.sif_flag
        ? `SIF potential detected (${sif.confidence_level} confidence). ${precursors.length ? "Key indicators: " + precursors.slice(0,3).join(", ") : "Model flagged based on narrative pattern."}`
        : "No strong SIF precursor detected. Report appears to be low potential for serious injury/fatality.";

      const actionsMap = {
        "Confined Space": ["Isolate and ventilate area", "Perform gas testing", "Enforce confined space permit"],
        "Working at Height": ["Use fall protection/harness", "Inspect scaffolds/ladders", "Barricade below work area"],
        "Energy Isolation": ["Apply lockout/tagout", "Verify isolation", "De-energize equipment"],
        "Line of Fire": ["Clear line of fire", "Secure suspended loads", "Use exclusion zones"],
        "Hot Work": ["Obtain hot work permit", "Remove flammables", "Provide fire watch"],
        "Driving and Transportation": ["Enforce speed limits", "Check seatbelts", "Brief journey management"],
      };
      let actions = [];
      (data.lsr_tags || []).forEach((t) => {
        if (actionsMap[t.rule_name]) actions.push(...actionsMap[t.rule_name]);
      });
      if (actions.length === 0) {
        actions = sif.sif_flag
          ? ["Stop unsafe activity immediately", "Conduct safety inspection", "Review applicable Life-Saving Rule", "Brief crew on hazard"]
          : ["Continue monitoring", "Document observation", "Share learning in toolbox talk"];
      }
      actions = [...new Set(actions)].slice(0, 5);

      setResult({
        risk,
        probability: prob,
        sifFlag: sif.sif_flag,
        confidence: sif.confidence_level,
        precursors: precursors.length ? precursors : ["No specific precursors detected"],
        explanation,
        actions,
        raw: data,
      });
    } catch (e) {
      setError("AI service unavailable. Ensure backend (8000) and AI (8001) are running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-page">
      <h1>AI SIF Prediction</h1>
      <p className="ai-subtitle">Analyze safety reports for Serious Injury & Fatality precursors</p>

      <div className="ai-input-card">
        <h2>Enter Safety Report {fromReport && <span style={{ fontSize: "13px", color: "#38bdf8", fontWeight: "normal" }}>— from {reportId}</span>}</h2>
        {fromReport && (
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 10px" }}>
            Incident description pre-filled from report details and locked. Click Analyze Report below.
            <button onClick={() => navigate("/analyze", { replace: true, state: {} })} style={{ marginLeft: "10px", background: "transparent", color: "#38bdf8", border: "none", cursor: "pointer", textDecoration: "underline" }}>Edit manually</button>
          </p>
        )}
        <textarea
          value={reportText}
          onChange={(e) => !fromReport && setReportText(e.target.value)}
          placeholder="Describe the unsafe act, unsafe condition, or near miss..."
          readOnly={fromReport}
          style={fromReport ? { background: "#0f172a", opacity: 0.85, cursor: "not-allowed" } : {}}
        />
        <button className="analyze-button" onClick={analyzeReport} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Report"}
        </button>
        {error && <p style={{ color: "#f87171", marginTop: "12px" }}>{error}</p>}
      </div>

      {result && (
        <div className="ai-result">
          <h2>AI Analysis Result</h2>

          <div className="risk-result">
            <span>Predicted Risk</span>
            <strong className={result.risk.toLowerCase()}>{result.risk}</strong>
          </div>

          <div className="probability">
            <span>SIF Probability</span>
            <strong>{result.probability}%</strong>
          </div>

          <div className="ai-section">
            <h3>Detected SIF Precursors</h3>
            <ul>
              {result.precursors.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
              Confidence: {result.confidence} • SIF Flag: {result.sifFlag ? "Yes" : "No"}
            </p>
          </div>

          <div className="ai-section">
            <h3>AI Explanation</h3>
            <p>{result.explanation}</p>
          </div>

          <div className="ai-section">
            <h3>Recommended Actions</h3>
            <ul>
              {result.actions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIPrediction;
