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

      <div>
        <Link to="/" aria-label="Go to Dashboard">Dashboard</Link>
        <Link to="/reports" aria-label="Go to Reports">Reports</Link>
        <Link to="/analyze" aria-label="Go to AI Prediction">AI Prediction</Link>
      </div>
    </nav>
  );
}

export default Navbar;
