import { useEffect, useState } from "react";
import Statcard from "../components/Statcard";
import Riskchart from "../components/Riskchart";
import CategoryChart from "../components/CategoryChart";
import { fetchDashboardStats } from "../api";
import { loadReports } from "../data/reportsData";

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboardStats().then(setStats).catch(() => {
      // fallback compute from localStorage
      const reports = loadReports();
      const byCat = reports.reduce((a, r) => { a[r.category] = (a[r.category]||0)+1; return a; }, {});
      const byRisk = reports.reduce((a, r) => { a[r.risk] = (a[r.risk]||0)+1; return a; }, {});
      setStats({
        total_reports: reports.length,
        by_category: byCat,
        by_risk: byRisk,
        by_status: {},
        sif_count: 0,
        lsr_counts: {},
      });
    });
  }, []);

  const total = stats ? stats.total_reports : 1250;
  const unsafeActs = stats ? (stats.by_category["Unsafe Act"] || 0) : 486;
  const unsafeCond = stats ? (stats.by_category["Unsafe Condition"] || 0) : 512;
  const nearMiss = stats ? (stats.by_category["Near Miss"] || 0) : 252;

  return (
    <div className="dashboard">
      <h1>OIL SIF Dashboard</h1>
      <p className="dashboard-subtitle">Welcome to the SIF Precursor Detection System {stats && stats.sif_count !== undefined && `— ${stats.sif_count} SIF flags`}</p>
      <h2>Dashboard Overview</h2>
      <div className="stat-grid">
        <Statcard title="Total Reports" value={total.toLocaleString()} />
        <Statcard title="Unsafe Acts" value={unsafeActs.toString()} />
        <Statcard title="Unsafe Conditions" value={unsafeCond.toString()} />
        <Statcard title="Near Miss" value={nearMiss.toString()} />
      </div>
      <div className="charts">
        <div className="chart-box"><Riskchart byRisk={stats?.by_risk} /></div>
        <div className="chart-box"><CategoryChart byCategory={stats?.by_category} /></div>
      </div>
    </div>
  );
}

export default Dashboard;
