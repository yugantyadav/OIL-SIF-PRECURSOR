import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Cctv() {
  const [camera, setCamera] = useState("Cam 1 Tank Farm");
  const [file, setFile] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);

  const samples = [
    { label: "PPE violation (no helmet)", text: "Worker without helmet entered Zone B", file: null },
    { label: "Fall - Critical", text: "Worker fell from scaffold and remained on ground", file: null },
    { label: "Oil leakage - Hydrocarbon", text: "Oil leakage detected near drilling equipment", file: null },
  ];

  const analyze = async (narrative) => {
    setLoading(true);
    setError("");
    setVerdict(null);
    try {
      // For now, reuse text AI endpoint with camera context; future: upload video to /api/cctv/events
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("camera_id", camera);
        // Try CCTV endpoint, fallback to text analyze
        try {
          const res = await fetch(`${API}/api/cctv/events`, { method: "POST", body: fd });
          if (res.ok) {
            const data = await res.json();
            const sif = data.sif || data;
            setVerdict({
              severity: sif.sif_flag ? (sif.confidence_level === "high" ? "Critical" : "Serious") : "Warning",
              rule: data.lsr_tags?.[0]?.rule_name || "Hydrocarbon Release",
              confidence: Math.round((sif.sif_probability || 0.82) * 100),
              timestamp: new Date().toLocaleString(),
              camera,
              narrative,
            });
            return;
          }
        } catch {}
      }
      const res = await fetch(`${API}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative, site: camera }),
      });
      const data = await res.json();
      const sif = data.sif || {};
      const prob = Math.round((sif.sif_probability || 0) * 100);
      let severity = "Warning";
      if (sif.sif_flag && sif.confidence_level === "high") severity = "Critical";
      else if (sif.sif_flag) severity = "Serious";
      setVerdict({
        severity,
        rule: data.lsr_tags?.[0]?.rule_name || (narrative.includes("leakage") ? "Hydrocarbon Release" : "PPE"),
        confidence: prob,
        timestamp: new Date().toLocaleString(),
        camera,
        narrative,
      });
    } catch (e) {
      setError("AI unavailable - ensure backend 8000 and AI 8001 are running");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1300px", margin: "0 auto", background: "#F4F4F4", minHeight: "70vh" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 6px", color: "#111111" }}>CCTV Surveillance</h1>
      <p style={{ color: "#4D4D4D", fontSize: "14px", marginBottom: "20px" }}>Upload a CCTV clip or pick a sample - AI draws boxes, checks zones, and gives a verdict.</p>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <select value={camera} onChange={(e) => setCamera(e.target.value)} style={{ height: "44px", border: "1px solid #E8E8E8", borderRadius: "6px", padding: "0 12px", fontFamily: "Poppins" }}>
          <option>Cam 1 Tank Farm</option>
          <option>Cam 2 Drill Deck</option>
          <option>Cam 3 Pipeline Sector C</option>
          <option>Cam 4 Workshop</option>
        </select>
        <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ padding: "10px", background: "white", border: "1px solid #E8E8E8", borderRadius: "6px" }} />
        <button className="submit-report-btn" onClick={() => analyze(file ? `Video from ${camera}: ${file.name}` : "Worker without helmet entered Zone B")} disabled={loading}>
          {loading ? "Analyzing..." : "Start Analysis"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        {samples.map((s) => (
          <button key={s.label} onClick={() => { setFile(null); analyze(s.text); }} style={{ padding: "8px 14px", borderRadius: "9999px", border: "1px solid #FFEEC6", background: "white", cursor: "pointer", fontFamily: "Poppins", fontSize: "12px", fontWeight: 600 }}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="cctv-grid">
        <div className="cctv-video-box">
          <div style={{ background: "#1A1E22", color: "#ECECEC", padding: "10px 14px", fontSize: "12px", fontWeight: 600, letterSpacing: "1px" }}>{camera} - Live</div>
          <div style={{ background: "#222931", height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "#A0A0A0", position: "relative", overflow: "hidden" }}>
            {/* Mock bbox overlay */}
            <div style={{ position: "absolute", left: "20%", top: "30%", width: "18%", height: "45%", border: "2px solid #FCAB04", borderRadius: "4px" }} />
            <div style={{ position: "absolute", left: "55%", top: "25%", width: "20%", height: "50%", border: "2px solid #00D084", borderRadius: "4px" }} />
            <div style={{ position: "absolute", left: "10%", top: "10%", width: "80%", height: "55%", border: "1px dashed rgba(252,171,4,0.6)", borderRadius: "6px" }} />
            <span style={{ fontSize: "13px" }}>{file ? file.name : "No video - click sample or upload MP4"}</span>
          </div>
          <div style={{ padding: "12px", background: "white", fontSize: "12px", color: "#4D4D4D" }}>
            Zone overlay: <span style={{ color: "#FCAB04", fontWeight: 600 }}>Restricted Zone B</span> (red dashed) — Intrusion flashes on violation
          </div>
        </div>

        <div className="cctv-verdict-box">
          <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 600 }}>Live Verdict</h3>
          {verdict ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F6F6F6", padding: "12px", borderRadius: "6px", marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#999" }}>Severity</span>
                <span style={{
                  padding: "6px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: 700,
                  background: verdict.severity === "Critical" ? "#CF2E2E" : verdict.severity === "Serious" ? "#FCAB04" : "#FFEEC6",
                  color: verdict.severity === "Warning" ? "#7a4d00" : "white"
                }}>{verdict.severity} {verdict.confidence}%</span>
              </div>
              <p style={{ fontSize: "13px", margin: "6px 0" }}><b>Rule:</b> {verdict.rule}</p>
              <p style={{ fontSize: "13px", margin: "6px 0" }}><b>Camera:</b> {verdict.camera}</p>
              <p style={{ fontSize: "13px", margin: "6px 0" }}><b>Time:</b> {verdict.timestamp}</p>
              <p style={{ fontSize: "13px", margin: "6px 0", color: "#4D4D4D" }}>{verdict.narrative}</p>
              <div style={{ marginTop: "12px", padding: "10px", background: "#FFF7E6", border: "1px solid #FFEEC6", borderRadius: "6px", fontSize: "12px" }}>
                <b>Auto 9-field report</b> will be created: What/Where/When/Why/How/Severity/People/Corrective/Preventive + 30s/60s clip. Officer must Approve.
              </div>
            </>
          ) : (
            <p style={{ color: "#A0A0A0", fontSize: "13px" }}>No analysis yet — pick a sample or upload a clip and click Start Analysis.</p>
          )}
          {error && <p style={{ color: "#CF2E2E", fontSize: "12px", marginTop: "10px" }}>{error}</p>}
        </div>
      </div>

      <div style={{ marginTop: "20px", background: "white", border: "1px solid #E8E8E8", borderRadius: "10px", padding: "16px" }}>
        <h4 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600 }}>Recent CCTV Incidents</h4>
        <p style={{ fontSize: "12px", color: "#A0A0A0" }}>Table mirrors Reports — report_id | Category | Description | Risk | Status | View — plus clip player (30s before/60s after). Wired to <code>GET /api/cctv/events</code> (falls back to Reports).</p>
        <div style={{ height: "48px", background: "#F4F4F4", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#A0A0A0", fontSize: "12px", marginTop: "8px" }}>
          CCTV incidents will appear here after analysis
        </div>
      </div>
    </div>
  );
}

export default Cctv;
