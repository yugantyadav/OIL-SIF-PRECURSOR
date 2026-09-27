import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  loadReports,
  saveReports,
} from "../data/reportsData";
import ReportHistory from "../components/ReportHistory";

function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(() => {
    return loadReports().find((r) => r.id === id) || null;
  });

  // ==========================================
  // LOAD FROM DUMMY FRONTEND DATA
  // ==========================================

  useEffect(() => {
    const reports = loadReports();
    const foundReport = reports.find((r) => r.id === id);

    setReport(foundReport || null);
  }, [id]);

  // ==========================================
  // HANDLE UPDATED DUMMY DATA
  // ==========================================

  useEffect(() => {
    const handleStorageChange = () => {
      const reports = loadReports();
      const updatedReport = reports.find((r) => r.id === id);

      if (updatedReport) {
        setReport(updatedReport);
      }
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, [id]);

  if (!report) {
    return (
      <div className="report-details">
        <button
          className="back-button"
          onClick={() => navigate("/reports")}
        >
          ← Back to Reports
        </button>

        <h1>Report Not Found</h1>

        <p style={{ color: "#94a3b8" }}>
          No report exists with ID {id}.
        </p>
      </div>
    );
  }

  return (
    <div className="report-details">

      <button
        className="back-button"
        onClick={() => navigate("/reports")}
      >
        ← Back to Reports
      </button>

      <h1>Report Details</h1>

      <div className="details-card">

        <div className="details-header">

          <div>
            <p className="label">Report ID</p>
            <h2>{report.id}</h2>
          </div>

          <div style={{ textAlign: "right" }}>
            <p
              className="label"
              style={{ marginBottom: "6px" }}
            >
              Current Risk
            </p>

            <span
              className={`risk ${report.risk.toLowerCase()}`}
            >
              {report.risk}
            </span>
          </div>

        </div>

        <div className="details-grid">

          <div>
            <p className="label">Category</p>
            <p>{report.category}</p>
          </div>

          <div>
            <p className="label">Status</p>
            <p>{report.status}</p>
          </div>

          <div>
            <p className="label">Location</p>
            <p>{report.location}</p>
          </div>

          <div>
            <p className="label">Date</p>
            <p>{report.date}</p>
          </div>

          <div>
            <p className="label">Reported By</p>
            <p>{report.reportedBy}</p>
          </div>

        </div>

        <div className="description-box">

          <p className="label">
            Incident Description
          </p>

          <p>{report.description}</p>

        </div>

        <button
          className="analyze-button"
          onClick={() =>
            navigate("/analyze", {
              state: {
                narrative: report.description,
                reportId: report.id,
              },
            })
          }
        >
          Analyze with AI
        </button>

      </div>

      <div
        style={{
          marginTop: "20px",
          maxWidth: "900px",
        }}
      >
        <ReportHistory reportId={report.id} />
      </div>

    </div>
  );
}

export default ReportDetails;