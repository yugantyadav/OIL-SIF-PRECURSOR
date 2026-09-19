export default function CctvPlayer({ src }) {
  return (
    <div style={{ background: "#1A1E22", borderRadius: "8px", overflow: "hidden" }}>
      <video
        controls
        src={src}
        style={{ width: "100%", height: "260px", background: "#222931", display: "block" }}
        poster=""
      />
      <div style={{ padding: "8px 12px", background: "white", fontSize: "12px", color: "#4D4D4D", display: "flex", justifyContent: "space-between" }}>
        <span>30s before / 60s after clip</span>
        <span style={{ color: "#A0A0A0" }}>Evidence stored in ./data/evidence/</span>
      </div>
    </div>
  );
}
