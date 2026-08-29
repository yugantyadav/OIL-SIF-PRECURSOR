import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadReports } from "../data/reportsData";
import { fetchReportById } from "../api";

function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(() => loadReports().find((r) => r.id === id) || null);
  const [loading, setLoading] = useState(!report);

  useEffect(() => {
    fetchReportById(id).then((r) => {
      setReport(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading && !report) {
    return (
      <div className="report-details">
        <button className="back-button" onClick={() => navigate("/reports")}>← Back to Reports</button>
        <p style={{ color: "#94a3b8" }}>Loading...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report-details">
        <button className="back-button" onClick={() => navigate("/reports")}>← Back to Reports</button>
        <h1>Report Not Found</h1>
        <p style={{ color: "#94a3b8" }}>No report exists with ID {id}.</p>
      </div>
    );
  }

  return (
    <div className="report-details">
      <button className="back-button" onClick={() => navigate("/reports")}>← Back to Reports</button>
      <h1>Report Details</h1>
      <div className="details-card">
        <div className="details-header">
          <div>
            <p className="label">Report ID</p>
            <h2>{report.id}</h2>
          </div>
          <span className={`risk ${report.risk.toLowerCase()}`}>{report.risk}</span>
        </div>
        <div className="details-grid">
          <div><p className="label">Category</p><p>{report.category}</p></div>
          <div><p className="label">Status</p><p>{report.status}</p></div>
          <div><p className="label">Location</p><p>{report.location}</p></div>
          <div><p className="label">Date</p><p>{report.date}</p></div>
          <div><p className="label">Reported By</p><p>{report.reportedBy}</p></div>
        </div>
        <div className="description-box">
          <p className="label">Incident Description</p>
          <p>{report.description}</p>
        </div>
        <button className="analyze-button" onClick={() => navigate("/analyze", { state: { narrative: report.description, reportId: report.id } })}>Analyze with AI</button>
      </div>
    </div>
  );
}

export default ReportDetails;
