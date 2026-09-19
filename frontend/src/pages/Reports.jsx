import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadReports, saveReports } from "../data/reportsData";
import { fetchReports, createReport } from "../api";
import AutoReportPreview from "../components/AutoReportPreview";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Reports() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [risk, setRisk] = useState("All Risk Levels");
  const [reports, setReports] = useState(() => loadReports());
  const [showAddForm, setShowAddForm] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvStatus, setCsvStatus] = useState("");
  const [csvUploading, setCsvUploading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    location: "",
    reportedBy: "",
    description: "",
  });

  const refreshReports = async () => {
    try {
      const data = await fetchReports();
      if (data.length > 0) {
        setReports(data);
        saveReports(data);
        setApiOnline(true);
      }
    } catch { setApiOnline(false); }
  };

  useEffect(() => {
    refreshReports();
    const id = setInterval(refreshReports, 15000);
    const onStorage = () => refreshReports();
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage); };
  }, []);
  useEffect(() => { saveReports(reports); }, [reports]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const generateDraft = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.location.trim() || !formData.reportedBy.trim()) return;
    setDrafting(true);
    setDraftError("");
    setDraft(null);
    try {
      const res = await fetch(`${API}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative: formData.description, site: formData.location }),
      });
      const data = await res.json();
      const sif = data.sif || {};
      const prob = Math.round((sif.sif_probability || 0.5) * 100);
      let risk = "Medium";
      if (prob >= 75) risk = "Critical";
      else if (prob >= 60) risk = "High";
      else if (prob < 35) risk = "Low";
      const category = data.lsr_tags?.[0]?.rule_name ? "Unsafe Act" : "Unsafe Condition";
      if (formData.description.toLowerCase().includes("near miss") || sif.confidence_level === "low") {
        // keep category as AI suggests
      }
      const lsr = data.lsr_tags?.[0]?.rule_name || null;
      setDraft({
        category: lsr ? "Unsafe Act" : (data.entities?.find((x) => x.entity_type === "activity")?.entity_value || "Unsafe Act"),
        description: formData.description.trim(),
        risk,
        status: "Open",
        location: formData.location.trim(),
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
        reportedBy: formData.reportedBy.trim(),
        lsr,
        confidence: sif.confidence_level,
        probability: prob,
        raw: data,
      });
    } catch {
      // Fallback draft if AI offline
      setDraft({
        category: "Unsafe Act",
        description: formData.description.trim(),
        risk: "Medium",
        status: "Open",
        location: formData.location.trim(),
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
        reportedBy: formData.reportedBy.trim(),
        lsr: null,
        confidence: "low",
        probability: 50,
        raw: null,
      });
      setDraftError("AI offline — showing fallback draft. Will save as Medium.");
    } finally {
      setDrafting(false);
    }
  };

  const submitDraft = async () => {
    if (!draft) return;
    const payload = {
      category: draft.category,
      description: draft.description,
      risk: draft.risk,
      status: draft.status,
      location: draft.location,
      date: draft.date,
      reported_by: draft.reportedBy,
    };
    try {
      const created = await createReport(payload);
      const newReport = {
        id: created.id || created.report_id,
        category: created.category,
        description: created.description,
        risk: created.risk,
        status: created.status,
        location: created.location,
        date: created.date || draft.date,
        reportedBy: created.reportedBy || payload.reported_by,
      };
      setReports((prev) => [newReport, ...prev]);
    } catch {
      const nextIdNum = reports.length > 0 ? Math.max(...reports.map((r) => parseInt(r.id.split("-")[1], 10) || 0)) + 1 : 1;
      const newId = `R-${String(nextIdNum).padStart(3, "0")}`;
      setReports((prev) => [{ id: newId, category: draft.category, description: draft.description, risk: draft.risk, status: draft.status, location: draft.location, date: draft.date, reportedBy: draft.reportedBy }, ...prev]);
    }
    setFormData({ location: "", reportedBy: "", description: "" });
    setDraft(null);
    setShowAddForm(false);
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    if (csvFile.size > 5 * 1024 * 1024) {
      setCsvStatus("✗ File too large — max 5 MB.");
      return;
    }
    setCsvUploading(true);
    setCsvStatus("Checking rows…");
    try {
      const text = await csvFile.text();
      const rows = text.trim().split(/\r?\n/);
      const dataRows = rows.length - 1;
      if (dataRows > 5000) {
        setCsvStatus(`✗ Too many rows (${dataRows}) — max 5000. Split the file.`);
        setCsvUploading(false);
        return;
      }
      if (dataRows <= 0) throw new Error("CSV has no data rows");
      setCsvStatus("Uploading…");
      const fd = new FormData();
      fd.append("file", csvFile);
      const res = await fetch(`${API}/api/reports/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setCsvStatus(`✓ Uploaded ${data.total_reports} report(s) (batch ${data.batch_id.slice(0,8)}…). Refreshing…`);
      setCsvFile(null);
      await refreshReports();
    } catch (err) {
      setCsvStatus(`✗ ${err.message}`);
    } finally {
      setCsvUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "description,location,reportedBy\n\"Oil leakage detected near drilling equipment\",\"Drilling Site - Zone A\",\"Safety Officer\"\n\"Worker entered restricted area without PPE\",\"Refinery - Unit B\",\"Site Supervisor\"\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "reports_template_simple.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.id.toLowerCase().includes(search.toLowerCase()) ||
      report.category.toLowerCase().includes(search.toLowerCase()) ||
      report.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All Categories" || report.category === category;
    const matchesRisk = risk === "All Risk Levels" || report.risk === risk;
    return matchesSearch && matchesCategory && matchesRisk;
  });

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1>Safety Reports</h1>
          <p className="reports-subtitle">
            OIL Unsafe Act, Unsafe Condition & Near-Miss Reports {apiOnline && <span style={{color:"#00D084", fontSize:"12px"}}>● API connected</span>}
          </p>
        </div>
        <button className="add-report-btn" onClick={() => { setShowAddForm((v) => !v); setDraft(null); }}>
          {showAddForm ? "× Cancel" : "+ Add Report"}
        </button>
      </div>

      {showAddForm && (
        <div className="add-report-card">
          <h3>Add New Report — AI Drafts the Risk</h3>
          <p className="add-report-subtitle">You describe <b>what happened, where, supervised by</b>. AI generates risk, category, and actions. You review before submit. No manual risk picker.</p>

          <form onSubmit={generateDraft}>
            <div className="add-report-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="form-field">
                <label>Where (Location) *</label>
                <input name="location" type="text" placeholder="e.g. Drilling Site - Zone A" value={formData.location} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label>Supervised by *</label>
                <input name="reportedBy" type="text" placeholder="e.g. Safety Officer" value={formData.reportedBy} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-field full-width">
              <label>What happened - Incident Description *</label>
              <textarea name="description" placeholder="Describe the unsafe act, unsafe condition, or near miss..." value={formData.description} onChange={handleChange} required maxLength={5000} />
              <span style={{ fontSize: "11px", color: "#A0A0A0" }}>{formData.description.length}/5000 chars</span>
            </div>
            <div className="add-report-actions">
              <button type="submit" className="submit-report-btn" disabled={drafting}>{drafting ? "Generating AI Draft..." : "Generate AI Draft"}</button>
              <button type="button" className="cancel-report-btn" onClick={() => { setShowAddForm(false); setDraft(null); }}>Cancel</button>
            </div>
            {draftError && <p style={{ color: "#FCAB04", fontSize: "12px", marginTop: "8px" }}>{draftError}</p>}
          </form>

          {draft && (
            <AutoReportPreview
              draft={draft}
              onSubmit={submitDraft}
              onEdit={() => setDraft(null)}
            />
          )}

          <hr style={{ border: "none", borderTop: "1px solid #E8E8E8", margin: "26px 0 20px" }} />

          <h4 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600 }}>Bulk Upload via CSV</h4>
          <p style={{ color: "#727272", fontSize: "13px", margin: "0 0 12px" }}>
            New simple headers: <code style={{ background: "#F6F6F6", padding: "2px 6px", borderRadius: "4px" }}>description, location, reportedBy</code> — AI will fill risk/category. Old headers still supported.
          </p>
          <form onSubmit={handleCsvUpload} style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} style={{ color: "#111111" }} />
            <button type="submit" className="submit-report-btn" disabled={!csvFile || csvUploading} style={{ opacity: !csvFile || csvUploading ? 0.6 : 1 }}>
              {csvUploading ? "Uploading…" : "Upload CSV"}
            </button>
            <button type="button" className="cancel-report-btn" onClick={downloadTemplate}>Download Template</button>
          </form>
          {csvStatus && <p style={{ marginTop: "10px", color: csvStatus.startsWith("✓") ? "#00D084" : "#CF2E2E", fontSize: "13px" }}>{csvStatus}</p>}
        </div>
      )}

      <div className="report-controls">
        <input type="text" placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All Categories</option>
          <option>Unsafe Act</option>
          <option>Unsafe Condition</option>
          <option>Near Miss</option>
        </select>
        <select value={risk} onChange={(e) => setRisk(e.target.value)}>
          <option>All Risk Levels</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      <div className="reports-table">
        <table>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Category</th>
              <th>Description</th>
              <th>Risk Level</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr key={report.id}>
                <td>{report.id}</td>
                <td>{report.category}</td>
                <td>{report.description}</td>
                <td><span className={`risk ${report.risk.toLowerCase()}`}>{report.risk}</span></td>
                <td>{report.status}</td>
                <td>
                  <button className="view-button" onClick={() => navigate(`/reports/${report.id}`)}>View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredReports.length === 0 && <p className="no-results">No reports found.</p>}
      </div>
    </div>
  );
}

export default Reports;
