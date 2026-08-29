import { useEffect, useState, useCallback } from "react";
import Statcard from "../components/Statcard";
import Riskchart from "../components/Riskchart";
import CategoryChart from "../components/CategoryChart";
import { fetchDashboardStats } from "../api";
import { loadReports } from "../data/reportsData";

function Dashboard() {
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(() => {
    fetchDashboardStats().then(setStats).catch(() => {
      const reports = loadReports();
      const byCat = reports.reduce((a, r) => { a[r.category] = (a[r.category]||0)+1; return a; }, {});
      const byRisk = reports.reduce((a, r) => { a[r.risk] = (a[r.risk]||0)+1; return a; }, {});
      setStats({
        total_reports: reports.length,
        by_category: byCat,
        by_risk: byRisk,
        by_status: {},
        sif_count: 0,
        sif_percentage: 0,
        lsr_counts: {},
      });
    });
  }, []);

  useEffect(() => {
    loadStats();
    const id = setInterval(loadStats, 15000);
    const onStorage = () => loadStats();
    window.addEventListener("storage", onStorage);
    const onVis = () => { if (document.visibilityState === "visible") loadStats(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage); document.removeEventListener("visibilitychange", onVis); };
  }, [loadStats]);

  const total = stats ? stats.total_reports : 0;
  const sifCount = stats ? stats.sif_count : 0;
  const sifPct = stats ? (stats.sif_percentage ?? (total ? Math.round(sifCount/total*1000)/10 : 0)) : 0;
  const sites = stats?.by_site ? Object.keys(stats.by_site).length : 15;
  const unsafeActs = stats ? (stats.by_category["Unsafe Act"] || 0) : 0;
  const unsafeCond = stats ? (stats.by_category["Unsafe Condition"] || 0) : 0;
  const nearMiss = stats ? (stats.by_category["Near Miss"] || 0) : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#FCAB04", margin: "0 0 8px" }}>SIF PRECURSOR DETECTION</p>
        <h1>Industrial Safety Dashboard</h1>
        <p className="dashboard-subtitle" style={{ color: "#ECECEC", marginBottom: "4px" }}>{total} reports analyzed across {sites} sites</p>
        <p className="hero-meta">Live monitoring of Serious Injury & Fatality precursor patterns</p>
        <div className="hero-badges">
          <span className="hero-badge">SIF RATE: {sifPct}%</span>
          <span className="hero-badge blue">{sifCount} FLAGGED</span>
        </div>
      </div>
      <div className="wave-divider" aria-hidden="true" />

      <div className="dashboard-content">
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
        {stats && stats.total_reports === 0 && <p style={{ color: "#A0A0A0", marginTop: "16px", fontSize: "14px" }}>No reports yet — add one via Reports → Add Report.</p>}
      </div>
    </div>
  );
}

export default Dashboard;
