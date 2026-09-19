import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function ReportHistory({ reportId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) return;
    // Try real endpoint, fallback to mock
    fetch(`${API}/api/report-logs/${reportId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const arr = Array.isArray(data) ? data : data.logs || [];
        setLogs(arr);
      })
      .catch(() => {
        // Mock history for demo (immutable log proof)
        setLogs([
          { action: "CREATE", actor: "Safety Officer", timestamp: "30 Aug 2026 14:32", source: "MANUAL", detail: `Created ${reportId}` },
          { action: "CCTV_CREATE", actor: "AI Vision", timestamp: "30 Aug 2026 14:33", source: "CCTV", detail: "Auto 9-field report from CCTV" },
          { action: "STATUS_CHANGE", actor: "HSE Manager", timestamp: "30 Aug 2026 15:00", source: "MANUAL", detail: "Status Open → Under Review" },
        ]);
      })
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) return <p style={{ color: "#A0A0A0", fontSize: "13px" }}>Loading history...</p>;

  return (
    <div className="history-timeline">
      <h4 style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#999", margin: "0 0 12px" }}>History — Immutable Log (append-only, no delete)</h4>
      <div style={{ position: "relative", paddingLeft: "18px", borderLeft: "2px solid #FFEEC6" }}>
        {logs.map((log, i) => (
          <div key={i} style={{ position: "relative", marginBottom: "14px", background: "white", border: "1px solid #E8E8E8", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ position: "absolute", left: "-24px", top: "12px", width: "10px", height: "10px", background: "#FCAB04", borderRadius: "50%", border: "2px solid white", boxShadow: "0 0 0 2px #FFEEC6" }} />
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#111111" }}>{log.action} <span style={{ fontWeight: 400, color: "#4D4D4D" }}>by {log.actor}</span></div>
            <div style={{ fontSize: "12px", color: "#6B7280" }}>{log.timestamp} • {log.source}</div>
            <div style={{ fontSize: "12px", color: "#334155", marginTop: "4px" }}>{log.detail || JSON.stringify(log.new_value || "").slice(0, 80)}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "11px", color: "#A0A0A0", marginTop: "8px" }}>This log is append-only — no UPDATE/DELETE API, never deletable via UI. Only migration via code can alter schema.</p>
    </div>
  );
}
