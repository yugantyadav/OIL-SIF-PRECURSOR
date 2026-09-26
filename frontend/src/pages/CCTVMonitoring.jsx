import { useCallback, useEffect, useRef, useState } from "react";
import "./CCTVMonitoring.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_URL = API.replace(/^http/, "ws") + "/api/cctv/ws";

// Downscale before sending: YOLO does not need 1080p, and this keeps the
// socket responsive on a laptop CPU.
const SEND_WIDTH = 640;
const SEND_INTERVAL_MS = 150;

const VERDICT_COPY = {
  CLEAR: { label: "CLEAR", tone: "clear" },
  WARNING: { label: "WARNING", tone: "warning" },
  HIGH: { label: "HIGH RISK", tone: "high" },
  SERIOUS: { label: "SERIOUS", tone: "serious" },
  CRITICAL: { label: "CRITICAL", tone: "critical" },
};

function severityFromEvents(events) {
  const rank = { CLEAR: 0, WARNING: 1, HIGH: 2, SERIOUS: 3, CRITICAL: 4 };
  let best = "CLEAR";
  let score = 0;
  for (const event of events) {
    const sev = event.severity || "WARNING";
    if ((rank[sev] ?? 1) > (rank[best] ?? 0)) {
      best = sev;
      score = event.risk_score || 0;
    }
  }
  return { verdict: best, risk_score: score };
}

function CCTVMonitoring() {
  const [mode, setMode] = useState("idle"); // idle | camera | file
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [summary, setSummary] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const [wsState, setWsState] = useState("closed"); // closed | connecting | open
  const [liveVerdict, setLiveVerdict] = useState({ verdict: "CLEAR", risk_score: 0 });

  const fileInput = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const sendTimerRef = useRef(null);
  const grabCanvasRef = useRef(null);
  const connIdRef = useRef(0);

  // Callback ref: the <video> only mounts when mode flips to "camera", so a
  // plain videoRef.current assignment inside startWebcam() runs BEFORE the
  // element exists and silently does nothing. This attaches the stream the
  // moment the node appears, however it appears. useCallback keeps the
  // identity stable so React does not detach/reattach it on every render.
  const attachVideo = useCallback((element) => {
    videoRef.current = element;

    if (element && streamRef.current && element.srcObject !== streamRef.current) {
      element.srcObject = streamRef.current;
      element.play().catch(() => {});
    }
  }, []);

  const stopEverything = () => {
    if (sendTimerRef.current) {
      clearInterval(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        /* already closing */
      }
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setWsState("closed");
  };

  const checkStatus = async () => {
    try {
      const response = await fetch(`${API}/api/cctv/status`);
      const data = await response.json();

      // The server only knows about a source once a frame has arrived, so this
      // is a fallback for the file-upload path; camera mode is tracked locally.
      if (!streamRef.current && !wsRef.current && data.source) {
        setSource(data.source);
        setMode((current) => (current === "camera" ? current : "file"));
      }
    } catch {
      /* backend not reachable yet */
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetch(`${API}/api/cctv/summary`);
      if (response.ok) setSummary(await response.json());
    } catch {
      /* ignore */
    }
  };

  // ------------------------------------------------------------------
  // WEBCAM
  // ------------------------------------------------------------------

  const startWebcam = async () => {
    setError(null);
    setLoading(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera access is unavailable. getUserMedia needs a secure context — use http://localhost or HTTPS."
      );
      setLoading(false);
      return;
    }

    let stream;
    try {
      // This is the call that makes the browser show the permission prompt.
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (err) {
      const denied = err?.name === "NotAllowedError" || err?.name === "SecurityError";
      setError(
        denied
          ? "Camera permission denied. Allow camera access in the browser address bar, then press Start Camera again."
          : `Could not open the camera: ${err?.message || err}`
      );
      setLoading(false);
      return;
    }

    streamRef.current = stream;
    setMode("camera");
    setSource("Webcam (browser)");
    setEvents([]);
    setAlert(null);
    setSummary(null);
    setLiveVerdict({ verdict: "CLEAR", risk_score: 0 });

    // If the video element already exists (stopping then restarting), attach
    // now; otherwise the <video ref={attachVideo}> callback handles it as soon
    // as React renders it for mode === "camera".
    attachVideo(videoRef.current);

    const connId = ++connIdRef.current;
    const grab = document.createElement("canvas");
    grabCanvasRef.current = grab;
    const grabCtx = grab.getContext("2d");

    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      if (connId !== connIdRef.current) return;
      setWsState("open");
      setLoading(false);

      sendTimerRef.current = setInterval(() => {
        if (connId !== connIdRef.current || ws.readyState !== WebSocket.OPEN) return;
        const v = videoRef.current;
        if (!v || !v.videoWidth) return;

        const scale = SEND_WIDTH / v.videoWidth;
        grab.width = SEND_WIDTH;
        grab.height = Math.round(v.videoHeight * scale);
        grabCtx.drawImage(v, 0, 0, grab.width, grab.height);

        grab.toBlob(
          (blob) => {
            if (blob && connId === connIdRef.current && ws.readyState === WebSocket.OPEN) {
              ws.send(blob);
            }
          },
          "image/jpeg",
          0.7
        );
      }, SEND_INTERVAL_MS);
    };

    ws.onmessage = (message) => {
      let data;
      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }
      if (!data?.ok) return;

      if (data.events?.length) {
        setEvents((current) => [...current, ...data.events].slice(-100));
        setAlert(data.events[data.events.length - 1]);
      }

      setLiveVerdict(severityFromEvents(data.all_events || []));

      // Draw the annotated frame the server actually analysed, so the overlay
      // can never drift out of sync with the detections it belongs to.
      const canvas = canvasRef.current;
      if (canvas && data.annotated_jpeg) {
        const image = new Image();
        image.onload = () => {
          canvas.width = image.width;
          canvas.height = image.height;
          canvas.getContext("2d").drawImage(image, 0, 0);
        };
        image.src = `data:image/jpeg;base64,${data.annotated_jpeg}`;
      }
    };

    ws.onerror = () => {
      if (connId !== connIdRef.current) return;
      setError("Lost the connection to the AI engine. Is the backend on port 8000?");
      setWsState("closed");
    };

    ws.onclose = () => {
      if (connId !== connIdRef.current) return;
      setWsState("closed");
    };
  };

  const stopWebcam = async () => {
    stopEverything();
    setMode("idle");
    setSource(null);
    setEvents([]);
    setAlert(null);
    try {
      await fetch(`${API}/api/cctv/stop`, { method: "POST" });
    } catch {
      /* ignore */
    }
  };

  // ------------------------------------------------------------------
  // VIDEO FILE
  // ------------------------------------------------------------------

  const uploadVideo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    stopEverything();
    setUploading(true);
    setError(null);
    setAlert(null);
    setEvents([]);
    setSummary(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch(`${API}/api/cctv/upload`, {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail || "Upload failed.");
      } else {
        setMode("file");
        setSource(data.stored_as);
        setLiveVerdict({ verdict: "CLEAR", risk_score: 0 });
      }
    } catch {
      setError("Upload failed — backend unreachable.");
    }

    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const stopFile = async () => {
    try {
      await fetch(`${API}/api/cctv/stop`, { method: "POST" });
    } catch {
      /* ignore */
    }
    setMode("idle");
    setSource(null);
  };

  useEffect(() => {
    checkStatus();
    loadSummary();

    const statusInterval = setInterval(checkStatus, 3000);
    const summaryInterval = setInterval(loadSummary, 2000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(summaryInterval);
      stopEverything();
    };
  }, []);

  // Release the webcam if the tab is hidden for a long time / closed.
  useEffect(() => {
    const onUnload = () => stopEverything();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const formatTime = (event) => {
    const timestamp = event.timestamp || event.time || event.created_at || event.date;
    if (!timestamp) return "Date unavailable";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
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

  const eventName = (event) => event.event_type || event.type || event.name || "SAFETY EVENT";
  const eventDescription = (event) =>
    event.description || event.message || "Potential safety precursor detected.";

  // File mode reads the server summary; camera mode computes it locally.
  const verdictKey = mode === "camera" ? liveVerdict.verdict : summary?.verdict;
  const riskScore = mode === "camera" ? liveVerdict.risk_score : summary?.risk_score ?? 0;
  const verdict = VERDICT_COPY[verdictKey] || VERDICT_COPY.CLEAR;

  const annotatedUrl =
    mode === "file" && summary?.annotated_video ? `${API}${summary.annotated_video}` : null;

  const analysing = mode === "file" && !summary?.finished;
  const live = mode === "camera" || analysing;

  return (
    <div className="cctv-page">
      <div className="cctv-header">
        <div>
          <div className="cctv-eyebrow">OIL SIF PRECURSOR</div>
          <h1>CCTV Safety Monitoring</h1>
          <p>Real-time AI surveillance and SIF precursor detection</p>
        </div>

        <div className={`system-status ${live ? "online" : "offline"}`}>
          <span className="status-dot"></span>
          {live ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
        </div>
      </div>

      {alert && live && (
        <div className="sif-alert">
          <div className="alert-icon">!</div>
          <div className="alert-content">
            <strong>SIF PRECURSOR DETECTED</strong>
            <span>
              {eventName(alert)} — {eventDescription(alert)}
            </span>
          </div>
          <div className="alert-time">{formatTime(alert)}</div>
        </div>
      )}

      {/* SOURCE PICKER */}
      <section className="upload-card">
        <div className="upload-copy">
          <h2>Choose a video source</h2>
          <p>
            Use your webcam for live AI monitoring, or upload a recorded clip.
            Both run the same YOLO + ByteTrack engine on the server.
          </p>
        </div>

        <div className="upload-actions">
          <button className="upload-btn" onClick={startWebcam} disabled={loading || uploading}>
            {loading ? "⏳ Requesting camera…" : "🎥 Start Camera"}
          </button>

          <input
            ref={fileInput}
            type="file"
            accept="video/mp4,video/avi,video/quicktime,video/x-matroska,video/webm"
            onChange={uploadVideo}
            hidden
          />
          <button
            className="upload-btn upload-btn--alt"
            onClick={() => fileInput.current?.click()}
            disabled={uploading || loading}
          >
            {uploading ? "⏳ Uploading…" : "⬆ Upload Clip"}
          </button>
        </div>

        {error && <div className="upload-error">{error}</div>}

        {mode === "camera" && (
          <div className="upload-source">
            Webcam connected • engine{" "}
            <strong>{wsState === "open" ? "streaming frames" : wsState}</strong>
          </div>
        )}

        {mode === "file" && source && (
          <div className="upload-source">
            Source: <strong>{source}</strong>
            {summary && (
              <>
                {" "}• {summary.frames_processed}/{summary.total_frames} frames
                {summary.finished ? " • analysis complete" : " • analysing…"}
              </>
            )}
          </div>
        )}
      </section>

      {/* VERDICT */}
      {(mode === "camera" || (summary && summary.frames_processed > 0)) && (
        <section className={`verdict-card verdict-${verdict.tone}`}>
          <div className="verdict-head">
            <div>
              <div className="verdict-eyebrow">SAFETY VERDICT</div>
              <div className="verdict-label">{verdict.label}</div>
            </div>
            <div className="verdict-score">
              <strong>{riskScore}</strong>
              <span>RISK SCORE</span>
            </div>
          </div>

          <p className="verdict-headline">
            {mode === "camera"
              ? events.length > 0
                ? `${events.length} safety precursor event(s) detected from the live feed.`
                : "Monitoring live — no safety precursor detected yet."
              : summary?.headline}
          </p>

          {mode === "file" && summary && (
            <div className="verdict-progress">
              <div
                className="verdict-progress-fill"
                style={{ width: `${summary.progress_percent}%` }}
              ></div>
            </div>
          )}

          {events.length > 0 && (
            <div className="verdict-chips">
              {Object.entries(
                events.reduce((acc, event) => {
                  const key = eventName(event);
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {})
              ).map(([type, count]) => (
                <span key={type} className="violation-chip">
                  {type.replace(/_/g, " ")} × {count}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MAIN GRID */}
      <div className="cctv-grid">
        <section className="video-card">
          <div className="card-header">
            <div>
              <h2>{mode === "camera" ? "Live Webcam Feed" : "Analysed Clip"}</h2>
              <span className="camera-id">
                {mode === "camera" ? "WEBCAM • SAFETY ZONE" : source || "NO SOURCE"}
              </span>
            </div>
            <div className="ai-stack">
              <span>YOLO11n</span>
              <span>ByteTrack</span>
            </div>
          </div>

          <div className="video-container">
            {mode === "camera" ? (
              <>
                <video ref={attachVideo} className="cctv-video" muted playsInline autoPlay />
                <canvas ref={canvasRef} className="cctv-overlay" />
                {wsState !== "open" && (
                  <div className="analysing-badge">
                    {wsState === "connecting" ? "CONNECTING TO AI ENGINE…" : "WAITING…"}
                  </div>
                )}
              </>
            ) : analysing || annotatedUrl ? (
              <>
                {annotatedUrl ? (
                  <video className="cctv-video" src={annotatedUrl} controls loop autoPlay muted />
                ) : (
                  <div className="camera-offline">
                    <div className="camera-icon">◉</div>
                    <h3>Analysing clip…</h3>
                    <p>{summary?.frames_processed ?? 0} frames scanned so far.</p>
                  </div>
                )}
                {analysing && (
                  <div className="analysing-badge">
                    ANALYSING {summary?.progress_percent ?? 0}%
                  </div>
                )}
              </>
            ) : (
              <div className="camera-offline">
                <div className="camera-icon">◉</div>
                <h3>No active feed</h3>
                <p>Start your webcam or upload a clip to begin analysis.</p>
              </div>
            )}

            {live && <div className="live-badge"><span></span>{mode === "camera" ? "LIVE" : "ANALYSING"}</div>}
          </div>

          <div className="camera-controls">
            {mode === "camera" ? (
              <button className="stop-btn" onClick={stopWebcam}>
                ■ Stop Camera
              </button>
            ) : mode === "file" ? (
              <button className="stop-btn" onClick={stopFile}>
                ■ Stop
              </button>
            ) : (
              <button className="start-btn" onClick={startWebcam} disabled={loading}>
                ▶ Start Camera
              </button>
            )}
          </div>
        </section>

        <aside className="right-panel">
          <section className="status-card">
            <div className="section-title">
              <h2>Detection Status</h2>
              <span className="status-live">{live ? "ACTIVE" : "IDLE"}</span>
            </div>
            <div className="status-row">
              <span>Source</span>
              <strong className={live ? "green" : "red"}>
                {mode === "camera" ? "WEBCAM" : mode === "file" ? "VIDEO FILE" : "OFFLINE"}
              </strong>
            </div>
            <div className="status-row">
              <span>Object Detection</span>
              <strong className="green">YOLO11n</strong>
            </div>
            <div className="status-row">
              <span>Tracking</span>
              <strong className="green">ByteTrack</strong>
            </div>
            <div className="status-row">
              <span>Frames Analysed</span>
              <strong className={summary?.frames_processed ? "green" : "gray"}>
                {summary?.frames_processed ?? 0}
              </strong>
            </div>
          </section>

          <section className="stats-card">
            <div className="stat">
              <span>Total Events</span>
              <strong>{events.length}</strong>
            </div>
            <div className="stat">
              <span>Active Alerts</span>
              <strong className="danger">{alert ? 1 : 0}</strong>
            </div>
            <div className="stat">
              <span>Risk Score</span>
              <strong>{riskScore}</strong>
            </div>
          </section>

          <section className="events-card">
            <div className="section-title">
              <h2>Recent SIF Events</h2>
              <span className="event-count">{events.length}</span>
            </div>

            {events.length === 0 ? (
              <div className="no-events">
                <div>✓</div>
                <p>No recent safety events</p>
                <span>The monitoring system is currently clear.</span>
              </div>
            ) : (
              <div className="events-list">
                {events.slice(-6).reverse().map((event, index) => (
                  <div className="event-item" key={`${eventName(event)}-${index}`}>
                    <div className="event-warning">!</div>
                    <div className="event-info">
                      <strong>{eventName(event)}</strong>
                      <p>{eventDescription(event)}</p>
                      <span>{formatTime(event)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {summary && (
            <section className="status-card">
              <div className="section-title">
                <h2>Detection Scope</h2>
              </div>
              <div className="scope-list">
                {(summary.detectable_signals || []).map((sig) => (
                  <div key={sig} className="scope-item scope-yes">✓ {sig}</div>
                ))}
                {(summary.not_detectable || []).map((sig) => (
                  <div key={sig} className="scope-item scope-no">✕ {sig}</div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

export default CCTVMonitoring;
