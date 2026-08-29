import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="oil-badge">OIL</div>
        <div className="brand-text">
          <span className="brand-title">SIF Precursor</span>
          <span className="brand-subtitle">SAFETY 1.0 PROTOTYPE</span>
        </div>
      </Link>

      <div>
        <Link to="/">Dashboard</Link>
        <Link to="/reports">Reports</Link>
        <Link to="/analyze">AI Prediction</Link>
      </div>
    </nav>
  );
}

export default Navbar;
