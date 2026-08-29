import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Navbar from "./components/Navbar";
import ReportDetails from "./pages/ReportDetails";
import AIPrediction from "./pages/AIPrediction";

function Splash({ onDone }) {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1400);
    const t2 = setTimeout(onDone, 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div className={`oil-splash ${fade ? "oil-splash--fade" : ""}`} aria-hidden="true">
      <div className="oil-splash__inner">
        <div className="oil-splash__badge">OIL</div>
        <div className="oil-splash__text">
          <span className="oil-splash__title">SIF Precursor</span>
          <span className="oil-splash__subtitle">SAFETY 1.0 PROTOTYPE</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // show once per tab session like ferrari.com refresh — use sessionStorage
    const seen = sessionStorage.getItem("oil_splash_seen");
    return !seen;
  });
  const handleDone = () => {
    sessionStorage.setItem("oil_splash_seen", "1");
    setShowSplash(false);
  };

  // allow hard refresh to replay: optional — clear on full reload is default sessionStorage behavior

  return (
    <BrowserRouter>
      {showSplash && <Splash onDone={handleDone} />}
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/:id" element={<ReportDetails />} />
        <Route path="/analyze" element={<AIPrediction />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
