import { useState } from "react";

function AIPrediction() {
  const [reportText, setReportText] = useState("");
  const [result, setResult] = useState(null);

  const analyzeReport = () => {
    if (!reportText.trim()) return;

    // Temporary demo prediction.
    // Later this will come from our Python AI backend.
    setResult({
      risk: "High",
      probability: 78,
      precursors: [
        "PPE non-compliance",
        "Restricted area entry",
        "Unsafe worker behavior",
      ],
      explanation:
        "The report contains multiple indicators associated with potential Serious Injury or Fatality exposure.",
      actions: [
        "Stop the unsafe activity immediately",
        "Ensure appropriate PPE is used",
        "Restrict unauthorized access to the area",
        "Conduct a safety inspection",
      ],
    });
  };

  return (
    <div className="ai-page">

      <h1>AI SIF Prediction</h1>

      <p className="ai-subtitle">
        Analyze safety reports for Serious Injury & Fatality precursors
      </p>

      <div className="ai-input-card">

        <h2>Enter Safety Report</h2>

        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          placeholder="Describe the unsafe act, unsafe condition, or near miss..."
        />

        <button
          className="analyze-button"
          onClick={analyzeReport}
        >
           Analyze Report
        </button>

      </div>

      {result && (
        <div className="ai-result">

          <h2>AI Analysis Result</h2>

          <div className="risk-result">
            <span>Predicted Risk</span>

            <strong className="high">
              {result.risk}
            </strong>
          </div>

          <div className="probability">
            <span>SIF Probability</span>
            <strong>{result.probability}%</strong>
          </div>

          <div className="ai-section">
            <h3> Detected SIF Precursors</h3>

            <ul>
              {result.precursors.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="ai-section">
            <h3> AI Explanation</h3>
            <p>{result.explanation}</p>
          </div>

          <div className="ai-section">
            <h3> Recommended Actions</h3>

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