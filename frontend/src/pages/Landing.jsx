import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchDashboardStats } from "../api";

function Landing() {
  const [stats, setStats] = useState({ total_reports: 600, sif_percentage: 45.3, sif_reports: 272 });

  useEffect(() => {
    fetchDashboardStats()
      .then((s) => setStats({ total_reports: s.total_reports, sif_percentage: s.sif_percentage ?? 45.3, sif_reports: s.sif_count ?? 272 }))
      .catch(() => {});
  }, []);

  return (
    <>
      <section className="landing-hero">
        <div className="landing-hero__inner">
          <p className="landing-hero__eyebrow">SIF PRECURSOR DETECTION</p>
          <h1 className="landing-hero__title">Industrial Safety Dashboard</h1>
          <p className="landing-hero__sub">
            {stats.total_reports} reports across 15 sites — powered by AI-driven SIF precursor analysis for Oil India Limited
          </p>
          <div className="hero-badges">
            <span className="hero-badge">SIF RATE: {stats.sif_percentage}%</span>
            <span className="hero-badge blue">{stats.sif_reports} FLAGGED</span>
          </div>
          <Link to="/dashboard" className="landing-hero__cta">Enter Platform →</Link>
        </div>
      </section>

      <svg className="wave-divider" viewBox="0 0 1280 85" preserveAspectRatio="none">
        <path d="M0,40 C160,80 320,0 480,40 C640,80 800,0 960,40 C1120,80 1280,0 1280,40 L1280,85 L0,85 Z" fill="#FFFFFF" />
      </svg>

      <section className="landing-section landing-section--light">
        <div className="landing-section__inner">
          <p className="landing-section__eyebrow">Problem Statement SIH26165</p>
          <h2 className="landing-section__title">Why Oil India Needs This</h2>
          <p className="landing-section__body">
            Serious Injury and Fatality (SIF) precursors are weak signals that precede catastrophic incidents. In oil
            and gas operations — drilling rigs, pipelines, refineries — these signals are buried in thousands of daily
            observations. Missing them costs lives and assets.
          </p>
          <p className="landing-section__body">
            This system detects SIF precursors in real-time from safety reports and CCTV feeds, mapping them to IOGP
            Life-Saving Rules and providing site-specific risk indices so that safety officers can intervene before
            incidents happen.
          </p>
        </div>
      </section>

      <svg className="wave-divider wave-divider--flip" viewBox="0 0 1280 85" preserveAspectRatio="none">
        <path d="M0,40 C160,80 320,0 480,40 C640,80 800,0 960,40 C1120,80 1280,0 1280,40 L1280,85 L0,85 Z" fill="#F4F4F4" />
      </svg>

      <section className="landing-section landing-section--grey">
        <div className="landing-section__inner">
          <p className="landing-section__eyebrow">How It Works</p>
          <h2 className="landing-section__title">Three Steps to Prevention</h2>
          <div className="landing-how-grid">
            <div className="landing-how-card">
              <div className="landing-how-card__icon">1</div>
              <h3>Describe or Upload CCTV</h3>
              <p>Paste a safety observation or upload CCTV footage from any site camera</p>
            </div>
            <div className="landing-how-card">
              <div className="landing-how-card__icon">2</div>
              <h3>AI Vision Analyzes</h3>
              <p>Our AI detects PPE compliance, fall hazards, zone intrusions, and toxic gas exposure patterns</p>
            </div>
            <div className="landing-how-card">
              <div className="landing-how-card__icon">3</div>
              <h3>Risk + Alert</h3>
              <p>Get SIF probability, IOGP rule mapping, severity classification, and instant alerts to officers</p>
            </div>
          </div>
        </div>
      </section>

      <svg className="wave-divider" viewBox="0 0 1280 85" preserveAspectRatio="none">
        <path d="M0,40 C160,80 320,0 480,40 C640,80 800,0 960,40 C1120,80 1280,0 1280,40 L1280,85 L0,85 Z" fill="#FFFFFF" />
      </svg>

      <section className="landing-section landing-section--light">
        <div className="landing-section__inner">
          <p className="landing-section__eyebrow">For Oil India Limited</p>
          <h2 className="landing-section__title">Built for Your Operations</h2>
          <div className="landing-use-grid">
            <div className="landing-use-card">
              <h3>Drilling Rigs</h3>
              <p>Monitor fall-from-height, confined space entry, energy isolation failures in real-time across all rig sites</p>
            </div>
            <div className="landing-use-card">
              <h3>Pipelines</h3>
              <p>Detect hydrocarbon release patterns, unauthorized zone intrusions, and line-of-fire violations</p>
            </div>
            <div className="landing-use-card">
              <h3>Refineries</h3>
              <p>Track PPE compliance, hot work permits, and toxic atmosphere conditions across processing units</p>
            </div>
          </div>
        </div>
      </section>

      <svg className="wave-divider wave-divider--flip" viewBox="0 0 1280 85" preserveAspectRatio="none">
        <path d="M0,40 C160,80 320,0 480,40 C640,80 800,0 960,40 C1120,80 1280,0 1280,40 L1280,85 L0,85 Z" fill="#F4F4F4" />
      </svg>

      <section className="landing-section landing-section--grey">
        <div className="landing-section__inner">
          <p className="landing-section__eyebrow">Key Features</p>
          <h2 className="landing-section__title">What You Get</h2>
          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <h3>Auto 9-Field Report</h3>
              <p>CCTV detection auto-generates a structured report with What, Where, When, Why, How, Severity, People, Corrective, and Preventive actions</p>
            </div>
            <div className="landing-feature-card">
              <h3>Site Risk Heatmap</h3>
              <p>Visual risk index per zone — green/amber/red — with frequency × severity × recency scoring and 30-day trend lines</p>
            </div>
            <div className="landing-feature-card">
              <h3>Immutable Audit Log</h3>
              <p>Every report creation, modification, and CCTV detection is logged with timestamps — no delete, full traceability</p>
            </div>
            <div className="landing-feature-card">
              <h3>Phone Push + Speaker</h3>
              <p>Critical alerts push to officer phones and trigger on-site speaker announcements for immediate response</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta-band">
        <div className="landing-cta-band__inner">
          <h2>See It In Action</h2>
          <p>Watch how CCTV footage is analyzed in real-time to detect safety hazards</p>
          <Link to="/cctv" className="landing-cta-band__btn">Watch CCTV Demo →</Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="footer-brand">
            <div className="oil-badge oil-badge--lg">OIL</div>
            <span>Oil India Limited — SIF Precursor Detection</span>
          </div>
          <p className="footer-copy">Smart India Hackathon SIH26165 | Built for HSSE Operations</p>
        </div>
      </footer>
    </>
  );
}

export default Landing;
