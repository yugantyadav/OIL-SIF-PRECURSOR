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

      <div className="nav-links">
        <Link to="/" className="nav-link" aria-label="Go to Home">Home</Link>
        <Link to="/dashboard" className="nav-link" aria-label="Go to Dashboard">Dashboard</Link>
        <Link to="/reports" className="nav-link" aria-label="Go to Reports">Reports</Link>
        <Link to="/cctv" className="nav-link" aria-label="Go to CCTV">CCTV</Link>
        <Link to="/classify" className="nav-link" aria-label="Go to Classify">Classify</Link>
      </div>
    </nav>
  );
}

export default Navbar;
