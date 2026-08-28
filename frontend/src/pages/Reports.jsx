
import { useState } from "react";

function Reports() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [risk, setRisk] = useState("All Risk Levels");

  const reports = [
    {
      id: "R-001",
      category: "Unsafe Act",
      description: "Worker entered restricted area without PPE",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-002",
      category: "Near Miss",
      description: "Oil leakage detected near drilling equipment",
      risk: "High",
      status: "Under Review",
    },
    {
      id: "R-003",
      category: "Unsafe Condition",
      description: "Damaged safety railing observed",
      risk: "Medium",
      status: "Resolved",
    },
    {
      id: "R-004",
      category: "Near Miss",
      description: "Vehicle nearly collided with pedestrian",
      risk: "High",
      status: "Open",
    },
    {
      id: "R-005",
      category: "Unsafe Act",
      description: "Operator failed to wear required safety helmet",
      risk: "High",
      status: "Open",
    },
    {
      id: "R-006",
      category: "Unsafe Condition",
      description: "Wet floor identified near maintenance workshop",
      risk: "Medium",
      status: "Under Review",
    },
    {
      id: "R-007",
      category: "Near Miss",
      description: "Falling tool narrowly missed maintenance worker",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-008",
      category: "Unsafe Act",
      description: "Employee used mobile phone while operating equipment",
      risk: "High",
      status: "Under Review",
    },
    {
      id: "R-009",
      category: "Unsafe Condition",
      description: "Emergency exit partially blocked by stored materials",
      risk: "High",
      status: "Open",
    },
    {
      id: "R-010",
      category: "Near Miss",
      description: "Forklift reversed close to pedestrian walkway",
      risk: "High",
      status: "Resolved",
    },
    {
      id: "R-011",
      category: "Unsafe Act",
      description: "Worker climbed ladder without maintaining three-point contact",
      risk: "Medium",
      status: "Open",
    },
    {
      id: "R-012",
      category: "Unsafe Condition",
      description: "Fire extinguisher found with expired inspection tag",
      risk: "High",
      status: "Under Review",
    },
    {
      id: "R-013",
      category: "Near Miss",
      description: "Loose electrical cable created a potential trip hazard",
      risk: "Medium",
      status: "Resolved",
    },
    {
      id: "R-014",
      category: "Unsafe Act",
      description: "Contractor removed machine guard during operation",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-015",
      category: "Unsafe Condition",
      description: "Poor lighting observed in equipment storage area",
      risk: "Medium",
      status: "Under Review",
    },
    {
      id: "R-016",
      category: "Near Miss",
      description: "Pressure hose disconnected unexpectedly during testing",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-017",
      category: "Unsafe Act",
      description: "Worker failed to use hearing protection in high-noise area",
      risk: "Medium",
      status: "Resolved",
    },
    {
      id: "R-018",
      category: "Unsafe Condition",
      description: "Corrosion identified on external equipment platform",
      risk: "High",
      status: "Under Review",
    },
    {
      id: "R-019",
      category: "Near Miss",
      description: "Dropped pipe was stopped before reaching personnel",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-020",
      category: "Unsafe Act",
      description: "Worker crossed barricaded maintenance zone",
      risk: "High",
      status: "Open",
    },
    {
      id: "R-021",
      category: "Unsafe Condition",
      description: "Oil-stained surface found beside pumping equipment",
      risk: "High",
      status: "Under Review",
    },
    {
      id: "R-022",
      category: "Near Miss",
      description: "Crane load swung unexpectedly near work area",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-023",
      category: "Unsafe Act",
      description: "Employee failed to secure tools before working at height",
      risk: "High",
      status: "Resolved",
    },
    {
      id: "R-024",
      category: "Unsafe Condition",
      description: "Damaged electrical socket discovered in control room",
      risk: "High",
      status: "Under Review",
    },
    {
      id: "R-025",
      category: "Near Miss",
      description: "Vehicle lost traction on wet access road",
      risk: "High",
      status: "Open",
    },
    {
      id: "R-026",
      category: "Unsafe Act",
      description: "Worker bypassed lockout-tagout procedure",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-027",
      category: "Unsafe Condition",
      description: "Loose handrail detected on elevated walkway",
      risk: "High",
      status: "Under Review",
    },
    {
      id: "R-028",
      category: "Near Miss",
      description: "Small gas leak detected before ignition occurred",
      risk: "Critical",
      status: "Resolved",
    },
    {
      id: "R-029",
      category: "Unsafe Act",
      description: "Worker lifted heavy equipment without assistance",
      risk: "Medium",
      status: "Open",
    },
    {
      id: "R-030",
      category: "Unsafe Condition",
      description: "Safety signage was missing near chemical storage area",
      risk: "Medium",
      status: "Resolved",
    },
    {
      id: "R-031",
      category: "Near Miss",
      description: "Vehicle entered pedestrian zone without warning alarm",
      risk: "High",
      status: "Under Review",
    },
    {
      id: "R-032",
      category: "Unsafe Act",
      description: "Technician worked on energized equipment without authorization",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-033",
      category: "Unsafe Condition",
      description: "Compressed gas cylinder was not properly secured",
      risk: "High",
      status: "Open",
    },
    {
      id: "R-034",
      category: "Near Miss",
      description: "Metal component slipped from lifting sling",
      risk: "Critical",
      status: "Under Review",
    },
    {
      id: "R-035",
      category: "Unsafe Act",
      description: "Worker entered confined space without completing permit check",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-036",
      category: "Unsafe Condition",
      description: "Water accumulation found near electrical panel",
      risk: "Critical",
      status: "Resolved",
    },
    {
      id: "R-037",
      category: "Near Miss",
      description: "Personnel nearly struck by moving mechanical arm",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-038",
      category: "Unsafe Act",
      description: "Employee did not follow designated pedestrian route",
      risk: "Medium",
      status: "Resolved",
    },
    {
      id: "R-039",
      category: "Unsafe Condition",
      description: "Damaged anti-slip flooring identified in workshop",
      risk: "Medium",
      status: "Under Review",
    },
    {
      id: "R-040",
      category: "Near Miss",
      description: "Scaffold component fell during dismantling activity",
      risk: "High",
      status: "Open",
    },
    {
      id: "R-041",
      category: "Unsafe Act",
      description: "Operator started equipment before confirming area was clear",
      risk: "Critical",
      status: "Under Review",
    },
    {
      id: "R-042",
      category: "Unsafe Condition",
      description: "Emergency shower access was blocked by equipment",
      risk: "High",
      status: "Open",
    },
    {
      id: "R-043",
      category: "Near Miss",
      description: "Electrical spark observed during equipment connection",
      risk: "Critical",
      status: "Resolved",
    },
    {
      id: "R-044",
      category: "Unsafe Act",
      description: "Worker failed to wear safety gloves during chemical handling",
      risk: "High",
      status: "Open",
    },
    {
      id: "R-045",
      category: "Unsafe Condition",
      description: "Loose bolts found on access platform",
      risk: "Medium",
      status: "Under Review",
    },
    {
      id: "R-046",
      category: "Near Miss",
      description: "Forklift load became unstable during transportation",
      risk: "High",
      status: "Open",
    },
    {
      id: "R-047",
      category: "Unsafe Act",
      description: "Worker operated equipment without completing required training",
      risk: "Critical",
      status: "Open",
    },
    {
      id: "R-048",
      category: "Unsafe Condition",
      description: "Ventilation system was not functioning in maintenance room",
      risk: "High",
      status: "Resolved",
    },
    {
      id: "R-049",
      category: "Near Miss",
      description: "Loose material was displaced by strong wind near worksite",
      risk: "Medium",
      status: "Under Review",
    },
    {
      id: "R-050",
      category: "Unsafe Act",
      description: "Employee failed to inspect lifting equipment before use",
      risk: "High",
      status: "Open",
    },
  ];

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
      <h1>Safety Reports</h1>

      <p className="reports-subtitle">
        OIL Unsafe Act, Unsafe Condition & Near-Miss Reports
      </p>

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
                    onClick={() =>
                      (window.location.href = `/reports/${report.id}`)
                    }
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

