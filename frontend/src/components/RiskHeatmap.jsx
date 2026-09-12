import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function RiskHeatmap() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/sites/risk`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => {
        setData({
          zones: [
            { zone: "Zone A Drilling", index: 78 },
            { zone: "Zone B Tank Farm", index: 45 },
            { zone: "Zone C Pipeline", index: 22 },
          ],
        });
      });
  }, []);

  const zones = data?.zones || [
    { zone: "Zone A Drilling", index: 78 },
    { zone: "Zone B Tank Farm", index: 45 },
    { zone: "Zone C Pipeline", index: 22 },
  ];

  const color = (idx) => (idx > 70 ? "#CF2E2E" : idx > 30 ? "#FCAB04" : "#00D084");
  const faint = (idx) => (idx > 70 ? "#f8d7da" : idx > 30 ? "#FFEEC6" : "#d4edda");

  // Actual OIL site coordinates - Duliajan, Assam (Oil India HQ)
  const center = [27.373, 95.322];
  const polygons = {
    "Zone A Drilling": [
      [27.378, 95.315],
      [27.378, 95.325],
      [27.373, 95.325],
      [27.373, 95.315],
    ],
    "Zone B Tank Farm": [
      [27.373, 95.325],
      [27.375, 95.335],
      [27.368, 95.335],
      [27.368, 95.325],
    ],
    "Zone C Pipeline": [
      [27.368, 95.31],
      [27.365, 95.32],
      [27.36, 95.32],
      [27.36, 95.31],
    ],
  };

  return (
    <div className="risk-heatmap" style={{ background: "white", border: "1px solid #E8E8E8", borderRadius: "10px", padding: "16px", marginTop: "16px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px" }}>Site Risk Index — Heatmap</h3>
      <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 12px" }}>Frequency × Severity (Critical=10) × Recency decay — green &lt;30, amber 30-70, red &gt;70 — Duliajan, Assam</p>

      {/* Actual map */}
      <div style={{ border: "1px solid #E8E8E8", borderRadius: "8px", overflow: "hidden", height: "240px", marginBottom: "16px" }}>
        <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false} dragging={true}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {zones.map((z) => {
            const pos = polygons[z.zone] || polygons["Zone A Drilling"];
            return (
              <Polygon
                key={z.zone}
                positions={pos}
                pathOptions={{ fillColor: faint(z.index), fillOpacity: 0.6, color: color(z.index), weight: 2 }}
              >
                <Tooltip sticky>
                  <b>{z.zone}</b><br />Risk Index: {z.index}
                </Tooltip>
              </Polygon>
            );
          })}
        </MapContainer>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "16px", fontSize: "11px", color: "#6B7280" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "10px", height: "10px", background: "rgba(207,46,46,0.15)", border: "1px solid #CF2E2E", borderRadius: "2px", display: "inline-block" }} /> High (&gt;70)</span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "10px", height: "10px", background: "rgba(252,171,4,0.15)", border: "1px solid #FCD370", borderRadius: "2px", display: "inline-block" }} /> Medium (30-70)</span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "10px", height: "10px", background: "rgba(0,208,132,0.15)", border: "1px solid #00D084", borderRadius: "2px", display: "inline-block" }} /> Low (&lt;30)</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
        {zones.map((z) => (
          <div key={z.zone} style={{ background: color(z.index), color: z.index > 30 && z.index <= 70 ? "#111111" : "white", padding: "14px", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", opacity: 0.9 }}>{z.zone}</div>
            <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px" }}>{z.index}</div>
            <div style={{ fontSize: "11px", opacity: 0.8 }}>Risk Index</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "12px", height: "48px", background: "#F4F4F4", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#A0A0A0", fontSize: "12px" }}>
        Trend line (last 30 days) — clicking a zone filters Reports • Map: Duliajan (27.37°N 95.32°E)
      </div>
    </div>
  );
}
