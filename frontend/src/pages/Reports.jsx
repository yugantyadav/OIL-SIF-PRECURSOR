import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initialReports, loadReports, saveReports } from "../data/reportsData";

function Reports() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [risk, setRisk] = useState("All Risk Levels");
  const [reports, setReports] = useState(() => loadReports());
  const [showAddForm, setShowAddForm] = useState(false);
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

  useEffect(() => {
    saveReports(reports);
  }, [reports]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddReport = (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.location.trim() || !formData.reportedBy.trim()) return;
    const nextIdNum = reports.length > 0 ? Math.max(...reports.map((r) => parseInt(r.id.split("-")[1], 10))) + 1 : 1;
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

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.id.toLowerCase().includes(search.toLowerCase()) ||
      report.category.toLowerCase().includes(search.toLowerCase()) ||
      report.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All Categories" ||
      report.category === category;

    const matchesRisk =
      risk === "All Risk Levels" ||
      report.risk === risk;

    return matchesSearch && matchesCategory && matchesRisk;
  });

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1>Safety Reports</h1>
          <p className="reports-subtitle">
            OIL Unsafe Act, Unsafe Condition & Near-Miss Reports
          </p>
        </div>
        <button className="add-report-btn" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? "× Cancel" : "+ Add Report"}
        </button>
      </div>

      {showAddForm && (
        <form className="add-report-card" onSubmit={handleAddReport}>
          <h3>Add New Report</h3>
          <p className="add-report-subtitle">All fields map directly to the Report Details view</p>

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
      )}

      <div className="report-controls">
        <input
          type="text"
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>All Categories</option>
          <option>Unsafe Act</option>
          <option>Unsafe Condition</option>
          <option>Near Miss</option>
        </select>

        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
        >
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

                <td>
                  <span
                    className={`risk ${report.risk.toLowerCase()}`}
                  >
                    {report.risk}
                  </span>
                </td>

                <td>{report.status}</td>

                <td>
                  <button
                    className="view-button"
                    onClick={() => navigate(`/reports/${report.id}`)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredReports.length === 0 && (
          <p className="no-results">
            No reports found.
          </p>
        )}
      </div>
    </div>
  );
}

export default Reports;
