import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadReports, saveReports } from "../data/reportsData";
import { fetchReports, createReport } from "../api";

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
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: "Unsafe Act",
    risk: "High",
    status: "Open",
    location: "",
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
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

  useEffect(() => { refreshReports(); }, []);
  useEffect(() => { saveReports(reports); }, [reports]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.location.trim() || !formData.reportedBy.trim()) return;
    const payload = {
      category: formData.category,
      description: formData.description.trim(),
      risk: formData.risk,
      status: formData.status,
      location: formData.location.trim(),
      date: formData.date,
      reported_by: formData.reportedBy.trim(),
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
        date: created.date || formData.date,
        reportedBy: created.reportedBy || payload.reported_by,
      };
      setReports((prev) => [newReport, ...prev]);
    } catch {
      const nextIdNum = reports.length > 0 ? Math.max(...reports.map((r) => parseInt(r.id.split("-")[1], 10) || 0)) + 1 : 1;
      const newId = `R-${String(nextIdNum).padStart(3, "0")}`;
      const newReport = {
        id: newId,
        category: formData.category,
        description: formData.description.trim(),
        risk: formData.risk,
        status: formData.status,
        location: formData.location.trim(),
        date: formData.date,
        reportedBy: formData.reportedBy.trim(),
      };
      setReports((prev) => [newReport, ...prev]);
    }
    setFormData({
      category: "Unsafe Act",
      risk: "High",
      status: "Open",
      location: "",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      reportedBy: "",
      description: "",
    });
    setShowAddForm(false);
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvStatus("");
    try {
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
    const csv = "report_id,date,category,description,risk,status,location,reportedBy\nR-101,30 August 2026,Unsafe Act,Worker entered restricted area without PPE,Critical,Open,Drilling Site - Zone A,Safety Officer\nR-102,29 August 2026,Near Miss,Oil leakage detected near drilling equipment,High,Open,Refinery - Unit B,Site Supervisor\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "reports_template.csv"; a.click();
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
            OIL Unsafe Act, Unsafe Condition & Near-Miss Reports {apiOnline && <span style={{color:"#22c55e", fontSize:"12px"}}>● API connected</span>}
          </p>
        </div>
        <button className="add-report-btn" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? "× Cancel" : "+ Add Report"}
        </button>
      </div>

      {showAddForm && (
        <div className="add-report-card">
          <h3>Add New Report</h3>
          <p className="add-report-subtitle">Add a single report or bulk-upload via CSV — all fields map to Report Details</p>

          {/* Manual form */}
          <form onSubmit={handleAddReport}>
            <div className="add-report-grid">
              <div className="form-field">
                <label>Category *</label>
                <select name="category" value={formData.category} onChange={handleChange} required>
                  <option>Unsafe Act</option>
                  <option>Unsafe Condition</option>
                  <option>Near Miss</option>
                </select>
              </div>
              <div className="form-field">
                <label>Risk Level *</label>
                <select name="risk" value={formData.risk} onChange={handleChange} required>
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div className="form-field">
                <label>Status *</label>
                <select name="status" value={formData.status} onChange={handleChange} required>
                  <option>Open</option>
                  <option>Under Review</option>
                  <option>Resolved</option>
                </select>
              </div>
              <div className="form-field">
                <label>Location *</label>
                <input name="location" type="text" placeholder="e.g. Drilling Site - Zone A" value={formData.location} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label>Date *</label>
                <input name="date" type="text" value={formData.date} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label>Reported By *</label>
                <input name="reportedBy" type="text" placeholder="e.g. Safety Officer" value={formData.reportedBy} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-field full-width">
              <label>Incident Description *</label>
              <textarea name="description" placeholder="Describe the unsafe act, unsafe condition, or near miss..." value={formData.description} onChange={handleChange} required />
            </div>
            <div className="add-report-actions">
              <button type="submit" className="submit-report-btn">Submit Report</button>
              <button type="button" className="cancel-report-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </form>

          <hr style={{ border: "none", borderTop: "1px solid #334155", margin: "26px 0 20px" }} />

          {/* CSV upload */}
          <h4 style={{ margin: "0 0 8px" }}>Bulk Upload via CSV</h4>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 12px" }}>
            CSV headers (case-insensitive): <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: "4px" }}>report_id, date, category, description, risk, status, location, reportedBy</code> — only <code>description</code> is required. All rows are stored with the same fields as above.
          </p>
          <form onSubmit={handleCsvUpload} style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} style={{ color: "white" }} />
            <button type="submit" className="submit-report-btn" disabled={!csvFile || csvUploading} style={{ opacity: !csvFile || csvUploading ? 0.6 : 1 }}>
              {csvUploading ? "Uploading…" : "Upload CSV"}
            </button>
            <button type="button" className="cancel-report-btn" onClick={downloadTemplate}>Download Template</button>
          </form>
          {csvStatus && <p style={{ marginTop: "10px", color: csvStatus.startsWith("✓") ? "#22c55e" : "#f87171", fontSize: "13px" }}>{csvStatus}</p>}
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
