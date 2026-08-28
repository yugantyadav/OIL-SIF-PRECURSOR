import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <h2>OIL SIF</h2>

      <div>
        <Link to="/">Dashboard</Link>
        <Link to="/reports">Reports</Link>
        <Link to="/prediction">AI Prediction</Link>
      </div>
    </nav>
  );
}

export default Navbar;