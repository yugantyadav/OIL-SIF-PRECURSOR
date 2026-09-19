import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <Link to="/" className="navbar-brand" aria-label="SIF Precursor Home">
        <div className="oil-badge" aria-hidden="true">OIL</div>
        <div className="brand-text">
          <span className="brand-title">SIF Precursor</span>
          <span className="brand-subtitle">SAFETY 1.0 PROTOTYPE</span>
        </div>
      </Link>

<<<<<<< HEAD
      <div>
        <Link to="/" aria-label="Go to Dashboard">Dashboard</Link>
        <Link to="/reports" aria-label="Go to Reports">Reports</Link>
        <Link to="/analyze" aria-label="Go to AI Prediction">AI Prediction</Link>
        <Link to="/cctv" aria-label="Go to CCTV Monitoring">CCTV Monitoring</Link>
=======
      <div className="nav-links">
        <Link to="/" className="nav-link" aria-label="Go to Home">Home</Link>
        <Link to="/dashboard" className="nav-link" aria-label="Go to Dashboard">Dashboard</Link>
        <Link to="/reports" className="nav-link" aria-label="Go to Reports">Reports</Link>
        <Link to="/cctv" className="nav-link" aria-label="Go to CCTV">CCTV</Link>
        <Link to="/classify" className="nav-link" aria-label="Go to Classify">Classify</Link>
>>>>>>> 7c5c7e71fa66bda87c5501c550c1820c44d36860
      </div>
    </nav>
  );
}

export default Navbar;
