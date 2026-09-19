export default function AutoReportPreview({ draft, onSubmit, onEdit }) {
  if (!draft) return null;
  return (
    <div style={{ background: "white", border: "1px solid #FFEEC6", borderRadius: "10px", padding: "16px", marginTop: "16px", boxShadow: "0 2px 8px rgba(255,249,235,0.32)" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 10px" }}>AI Draft — Review Before Submit</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px", fontSize: "13px" }}>
        <div><b>Category:</b> {draft.category}</div>
        <div><b>Risk:</b> <span style={{ background: draft.risk === "Critical" ? "#CF2E2E" : draft.risk === "High" ? "#FCAB04" : "#FFEEC6", color: draft.risk === "Medium" ? "#7a4d00" : draft.risk === "Low" ? "white" : "white", padding: "4px 8px", borderRadius: "9999px", fontSize: "12px" }}>{draft.risk}</span></div>
        <div><b>Where:</b> {draft.location}</div>
        <div><b>Supervised by:</b> {draft.reportedBy}</div>
      </div>
      <p style={{ fontSize: "13px", marginTop: "10px" }}><b>Description:</b> {draft.description}</p>
      {draft.lsr && <p style={{ fontSize: "12px", color: "#4D4D4D" }}><b>LSR:</b> {draft.lsr} • <b>Confidence:</b> {draft.confidence}</p>}
      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
        <button onClick={onSubmit} style={{ background: "#FCAB04", color: "#111111", border: "1px solid #FCAB04", borderRadius: "6px", padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>Submit</button>
        <button onClick={onEdit} style={{ background: "white", border: "1px solid #E8E8E8", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" }}>Edit description</button>
      </div>
    </div>
  );
}
