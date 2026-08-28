const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchReports(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/api/reports${qs ? "?" + qs : ""}`);
  if (!res.ok) throw new Error("Backend unavailable");
  const data = await res.json();
  // backend returns { total, reports: [...] }
  if (data.reports) return data.reports.map(r => ({
    id: r.id,
    category: r.category,
    description: r.description,
    risk: r.risk,
    status: r.status,
    location: r.location,
    date: r.date,
    reportedBy: r.reportedBy,
  }));
  return [];
}

export async function fetchReportById(id) {
  const res = await fetch(`${API_BASE}/api/reports/${id}`);
  if (!res.ok) throw new Error("Not found");
  const r = await res.json();
  return {
    id: r.id,
    category: r.category,
    description: r.description,
    risk: r.risk,
    status: r.status,
    location: r.location,
    date: r.date,
    reportedBy: r.reportedBy,
  };
}

export async function createReport(payload) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Create failed");
  }
  return res.json();
}

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/api/dashboard/stats`);
  if (!res.ok) throw new Error("Stats unavailable");
  return res.json();
}

export async function analyzeNarrative(payload) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Analyze failed");
  return res.json();
}
