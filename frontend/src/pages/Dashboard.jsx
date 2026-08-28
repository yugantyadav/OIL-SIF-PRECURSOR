import React from "react";
import Statcard from "../components/Statcard";
import Riskchart from "../components/Riskchart";
import CategoryChart from "../components/CategoryChart";

function Dashboard() {
  return (
    <div className="dashboard">

      <h1>OIL SIF Dashboard</h1>

      <p className="dashboard-subtitle">
        Welcome to the SIF Precursor Detection System
      </p>

      <h2>Dashboard Overview</h2>

      {/* STAT CARDS */}
      <div className="stat-grid">

        <Statcard
          title="Total Reports"
          value="1,250"
        />

        <Statcard
          title="Unsafe Acts"
          value="486"
        />

        <Statcard
          title="Unsafe Conditions"
          value="512"
        />

        <Statcard
          title="Near Miss"
          value="252"
        />

      </div>


      {/* TWO CHARTS */}
      <div className="charts">

        <div className="chart-box">
          <Riskchart />
        </div>

        <div className="chart-box">
          <CategoryChart />
        </div>

      </div>

    </div>
  );
}

export default Dashboard;