import { useEffect, useState } from "react";
import "./CCTVMonitoring.css";

const API = "http://127.0.0.1:8000";

function CCTVMonitoring() {
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const checkStatus = async () => {
    try {
      const response = await fetch(`${API}/api/cctv/status`);
      const data = await response.json();
      setRunning(Boolean(data.running));
    } catch (error) {
      setRunning(false);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch(`${API}/api/cctv/events`);
      const data = await response.json();

      const eventList = Array.isArray(data)
        ? data
        : data.events || [];

      setEvents(eventList);

      if (eventList.length > 0) {
        setAlert(eventList[0]);
      }
    } catch (error) {
      console.log("Could not load CCTV events");
    }
  };

  const startCCTV = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/cctv/start`, {
        method: "POST",
      });

      if (response.ok) {
        setRunning(true);
      }
    } catch (error) {
      console.error("CCTV start failed:", error);
    }

    setLoading(false);
  };

  const stopCCTV = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/cctv/stop`, {
        method: "POST",
      });

      if (response.ok) {
        setRunning(false);
      }
    } catch (error) {
      console.error("CCTV stop failed:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
    loadEvents();

    const statusInterval = setInterval(checkStatus, 2000);
    const eventInterval = setInterval(loadEvents, 2000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(eventInterval);
    };
  }, []);

const formatTime = (event) => {
  const timestamp =
    event.timestamp ||
    event.time ||
    event.created_at ||
    event.date;

  if (!timestamp) return "Date unavailable";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};
  const eventName = (event) => {
    return (
      event.event_type ||
      event.type ||
      event.name ||
      "SAFETY EVENT"
    );
  };

  const eventDescription = (event) => {
    return (
      event.description ||
      event.message ||
      "Potential safety precursor detected."
    );
  };

  return (
    <div className="cctv-page">

      {/* HEADER */}
      <div className="cctv-header">
        <div>
          <div className="cctv-eyebrow">
            OIL SIF PRECURSOR
          </div>

          <h1>CCTV Safety Monitoring</h1>

          <p>
            Real-time AI-powered surveillance and SIF precursor detection
          </p>
        </div>

        <div className={`system-status ${running ? "online" : "offline"}`}>
          <span className="status-dot"></span>
          {running ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
        </div>
      </div>

      {/* ALERT */}
      {alert && running && (
        <div className="sif-alert">
          <div className="alert-icon">!</div>

          <div className="alert-content">
            <strong>SIF PRECURSOR DETECTED</strong>
            <span>
              {eventName(alert)} — {eventDescription(alert)}
            </span>
          </div>

          <div className="alert-time">
            {formatTime(alert)}
          </div>
        </div>
      )}

      {/* MAIN GRID */}
      <div className="cctv-grid">

        {/* VIDEO */}
        <section className="video-card">

          <div className="card-header">
            <div>
              <h2>Live CCTV Feed</h2>
              <span className="camera-id">
                CAMERA 01 • SAFETY ZONE
              </span>
            </div>

            <div className="ai-stack">
              <span>YOLO</span>
              <span>ByteTrack</span>
            </div>
          </div>

          <div className="video-container">

            {running ? (
              <img
                src={`${API}/api/cctv/stream`}
                className="cctv-video"
                alt="Live CCTV Feed"
              />
            ) : (
              <div className="camera-offline">
                <div className="camera-icon">◉</div>

                <h3>Camera Offline</h3>

                <p>
                  Start CCTV monitoring to begin AI detection.
                </p>
              </div>
            )}

            {running && (
              <div className="live-badge">
                <span></span>
                LIVE
              </div>
            )}
          </div>

          {/* CONTROLS */}
          <div className="camera-controls">

            <button
              className="start-btn"
              onClick={startCCTV}
              disabled={running || loading}
            >
              ▶ Start CCTV
            </button>

            <button
              className="stop-btn"
              onClick={stopCCTV}
              disabled={!running || loading}
            >
              ■ Stop CCTV
            </button>

          </div>

        </section>

        {/* RIGHT PANEL */}
        <aside className="right-panel">

          {/* STATUS CARD */}
          <section className="status-card">

            <div className="section-title">
              <h2>Detection Status</h2>

              <span className="status-live">
                {running ? "ACTIVE" : "IDLE"}
              </span>
            </div>

            <div className="status-row">
              <span>Camera</span>
              <strong className={running ? "green" : "red"}>
                {running ? "ONLINE" : "OFFLINE"}
              </strong>
            </div>

            <div className="status-row">
              <span>Object Detection</span>
              <strong className="green">YOLO</strong>
            </div>

            <div className="status-row">
              <span>Tracking</span>
              <strong className="green">ByteTrack</strong>
            </div>

            <div className="status-row">
              <span>Safety Analysis</span>
              <strong className={running ? "green" : "gray"}>
                {running ? "ACTIVE" : "STANDBY"}
              </strong>
            </div>

          </section>

          {/* STATISTICS */}
          <section className="stats-card">

            <div className="stat">
              <span>Total Events</span>
              <strong>{events.length}</strong>
            </div>

            <div className="stat">
              <span>Active Alerts</span>
              <strong className="danger">
                {alert ? 1 : 0}
              </strong>
            </div>

            <div className="stat">
              <span>Detection Engine</span>
              <strong>AI</strong>
            </div>

          </section>

          {/* EVENTS */}
          <section className="events-card">

            <div className="section-title">
              <h2>Recent SIF Events</h2>

              <span className="event-count">
                {events.length}
              </span>
            </div>

            {events.length === 0 ? (
              <div className="no-events">
                <div>✓</div>
                <p>No recent safety events</p>
                <span>
                  The monitoring system is currently clear.
                </span>
              </div>
            ) : (
              <div className="events-list">

                {events.slice(0, 6).map((event, index) => (

                  <div className="event-item" key={index}>

                    <div className="event-warning">
                      !
                    </div>

                    <div className="event-info">
                      <strong>
                        {eventName(event)}
                      </strong>

                      <p>
                        {eventDescription(event)}
                      </p>

                      <span>
                        {formatTime(event)}
                      </span>
                    </div>

                  </div>

                ))}

              </div>
            )}

          </section>

        </aside>

      </div>

    </div>
  );
}

export default CCTVMonitoring;