import { useParams, useNavigate } from "react-router-dom";

function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

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
            <h2>{id}</h2>
          </div>

          <span className="risk critical">
            Critical
          </span>
        </div>

        <div className="details-grid">

          <div>
            <p className="label">Category</p>
            <p>Unsafe Act</p>
          </div>

          <div>
            <p className="label">Status</p>
            <p>Open</p>
          </div>

          <div>
            <p className="label">Location</p>
            <p>Drilling Site - Zone A</p>
          </div>

          <div>
            <p className="label">Date</p>
            <p>28 August 2026</p>
          </div>

          <div>
            <p className="label">Reported By</p>
            <p>Safety Officer</p>
          </div>

        </div>

        <div className="description-box">
          <p className="label">
            Incident Description
          </p>

          <p>
            Worker entered restricted area without PPE.
          </p>
        </div>

        <button
          className="analyze-button"
          onClick={() => navigate("/analyze")}
        >
           Analyze with AI
        </button>

      </div>

    </div>
  );
}

export default ReportDetails;