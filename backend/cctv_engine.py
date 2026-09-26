import os
import time
import threading
import cv2
import numpy as np
from ultralytics import YOLO
from datetime import datetime

# COCO classes that count as machinery/plant a worker must not stand next to.
MACHINERY_CLASSES = {"car", "truck", "bus", "motorcycle", "bicycle", "train", "boat"}


class CCTVEngine:
    """
    YOLO + ByteTrack safety engine for OIL SIF Precursor detection.

    Runs against a live camera index (int) or a video file path (str), so an
    uploaded clip can be analysed frame-by-frame exactly like a live feed.

    NOTE ON MODEL SCOPE
    -------------------
    yolo11n.pt is trained on COCO, which has no `helmet`, `vest`, `fire` or
    `smoke` classes. Those SIF signals require a purpose-trained model and are
    NOT produced here. What IS detectable from COCO + geometry:
        - restricted zone intrusion  (person centroid inside zone polygon)
        - fall / suspected injury    (person bbox aspect ratio collapse)
        - unsafe proximity           (worker near machinery/plant)
    Anything the spec lists beyond these needs a custom model, not a code fix.
    """

    def __init__(self):
        self.model = YOLO("yolo11n.pt")
        self.camera = None
        self.running = False
        self.latest_events = []
        self.latest_detections = []
        self.last_alert_time = 0
        self.alert_cooldown = 5
        self.person_zone_frames = {}
        self.required_frames = 10

        # source + progress tracking
        self.source = None
        self.source_name = None
        self.is_video_file = False
        self.total_frames = 0
        self.frames_processed = 0
        self.finished = False
        self.error = None

        # per-track temporal state for fall / proximity
        self.person_low_ratio_frames = {}
        self.max_event_log = 100

        # background analysis (video files) + annotated output
        self.analysis_thread = None
        self.annotated_path = None

        # browser-webcam mode: frames arrive over a websocket, not from a
        # cv2.VideoCapture, so serialise inference against the stateful
        # per-track counters.
        self._frame_lock = threading.Lock()
        self.external_mode = False
        # Connection generation, so a stale socket closing cannot stop the
        # session a newer socket just started (tab refresh / second tab).
        self.conn_gen = 0

    # ------------------------------------------------------------------
    # BROWSER WEBCAM MODE
    # ------------------------------------------------------------------

    def start_external(self, label="Webcam (browser)"):
        """
        Switch to browser-webcam mode.

        The webcam belongs to the browser, not this container, so there is no
        cv2.VideoCapture here. The browser pushes JPEG frames to
        /api/cctv/ws and we run inference on each one.
        """
        if self.analysis_thread is not None and self.analysis_thread.is_alive():
            self.stop()

        self.running = True
        self.external_mode = True
        self.source = label
        self.source_name = label
        self.is_video_file = False
        self.annotated_path = None
        self.analysis_thread = None
        self.camera = None
        self.total_frames = 0
        self.fps = 0
        self.frames_processed = 0
        self.finished = False
        self.error = None
        self.latest_events = []
        self.latest_detections = []
        self.person_zone_frames = {}
        self.person_low_ratio_frames = {}
        self.last_alert_time = 0
        self.conn_gen += 1
        print(f"CCTV switched to {label}.")
        return self.source_name

    def process_external_frame(self, jpeg_bytes):
        """
        Run inference on one browser-supplied JPEG frame.

        Returns the payload the UI needs: detections, new events, the zone
        rectangle and the current verdict.
        """
        frame = cv2.imdecode(np.frombuffer(jpeg_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)

        if frame is None:
            self.error = "Could not decode the frame sent by the browser."
            return {"ok": False, "error": self.error}

        with self._frame_lock:
            before = len(self.latest_events)
            processed = self.process_frame(frame)
            self.frames_processed += 1
            new_events = self.latest_events[before:]

            height, width = processed.shape[:2]
            zone = self.get_zone(width, height)

            ok, buffer = cv2.imencode(".jpg", processed, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            annotated = buffer.tobytes() if ok else None

        return {
            "ok": True,
            "detections": self.latest_detections,
            "events": new_events,
            "all_events": self.latest_events,
            "zone": {
                "x1": zone[0], "y1": zone[1], "x2": zone[2], "y2": zone[3],
            },
            "frames_processed": self.frames_processed,
            "annotated_jpeg": annotated,
        }

    # ------------------------------------------------------------------
    # LIFECYCLE
    # ------------------------------------------------------------------

    def start(self, source=0):
        """
        Start processing from `source`.

        source=0            -> default camera (live)
        source=3            -> specific camera index
        source="/path/x.mp4" -> video file (uploaded clip)

        Accepts str paths as well as ints so a numeric-looking filename is not
        silently treated as a camera index.
        """
        if self.running:
            self.stop()

        if isinstance(source, str) and not os.path.isfile(source):
            self.error = f"Video file not found: {source}"
            raise RuntimeError(self.error)

        self.camera = cv2.VideoCapture(source)

        if not self.camera.isOpened():
            self.error = (
                "Unable to open CCTV camera."
                if not isinstance(source, str)
                else f"Unable to open video file: {source}"
            )
            raise RuntimeError(self.error)

        self.running = True
        self.source = source
        self.is_video_file = isinstance(source, str)
        self.source_name = os.path.basename(source) if self.is_video_file else f"Camera {source}"
        self.total_frames = int(self.camera.get(cv2.CAP_PROP_FRAME_COUNT) or 0) if self.is_video_file else 0
        self.fps = int(self.camera.get(cv2.CAP_PROP_FPS) or 0)
        self.frames_processed = 0
        self.finished = False
        self.error = None
        self.latest_events = []
        self.latest_detections = []
        self.person_zone_frames = {}
        self.person_low_ratio_frames = {}
        self.last_alert_time = 0

        if self.is_video_file:
            # Analyse the whole clip on a background thread. Without this the
            # frames are only advanced by whoever is consuming the MJPEG
            # stream, so an uploaded clip would sit at 0 frames forever if no
            # browser happened to be watching.
            self.annotated_path = f"{os.path.splitext(source)[0]}_annotated.mp4"
            self.analysis_thread = threading.Thread(target=self._analyze_worker, daemon=True)
            self.analysis_thread.start()
        else:
            self.annotated_path = None
            self.analysis_thread = None

        print(f"CCTV started on source: {self.source_name}")
        return self.source_name

    def _analyze_worker(self):
        """
        Process every frame of the uploaded clip and write an annotated copy.

        Runs detached from any HTTP request so the verdict is available even if
        nobody is watching the stream.
        """
        writer = None
        try:
            fps = self.fps if self.fps > 0 else 5

            while self.running:
                success, frame = self.camera.read()

                if not success:
                    break

                if writer is None:
                    height, width = frame.shape[:2]
                    writer = cv2.VideoWriter(
                        self.annotated_path,
                        cv2.VideoWriter_fourcc(*"mp4v"),
                        fps,
                        (width, height),
                    )
                    if not writer.isOpened():
                        print(f"Could not open annotated writer for {self.annotated_path}")
                        writer = None

                self.frames_processed += 1
                processed = self.process_frame(frame)

                if writer is not None:
                    writer.write(processed)

            self.finished = True
            print(
                f"Analysis complete for {self.source_name}: "
                f"{self.frames_processed} frames, {len(self.latest_events)} event(s)."
            )
        except Exception as exc:  # keep the worker from killing the process
            self.error = f"Analysis failed: {exc}"
            print(self.error)
        finally:
            if writer is not None:
                writer.release()
            self.running = False

    def stop(self):
        self.running = False

        if self.analysis_thread is not None and self.analysis_thread.is_alive():
            self.analysis_thread.join(timeout=5)
        self.analysis_thread = None

        if self.camera is not None:
            self.camera.release()
            self.camera = None

        self.latest_detections = []
        self.person_zone_frames = {}
        self.person_low_ratio_frames = {}
        self.external_mode = False
        print("CCTV stopped.")

    def get_zone(self, width, height):
        x1 = int(width * 0.28)
        y1 = int(height * 0.20)
        x2 = int(width * 0.72)
        y2 = int(height * 0.82)
        return x1, y1, x2, y2

    # ------------------------------------------------------------------
    # EVENT HELPERS
    # ------------------------------------------------------------------

    def _log_event(self, events, event):
        """Append to the accumulated event log (capped) respecting cooldown."""
        current_time = time.time()
        if current_time - self.last_alert_time <= self.alert_cooldown:
            return
        events.append(event)
        self.last_alert_time = current_time

    def _track_state_reset(self, current_ids):
        for stale in set(self.person_zone_frames) - current_ids:
            self.person_zone_frames.pop(stale, None)
        for stale in set(self.person_low_ratio_frames) - current_ids:
            self.person_low_ratio_frames.pop(stale, None)

    # ------------------------------------------------------------------
    # FRAME PROCESSING
    # ------------------------------------------------------------------

    def process_frame(self, frame):
        height, width = frame.shape[:2]
        zone_x1, zone_y1, zone_x2, zone_y2 = self.get_zone(width, height)

        results = self.model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            conf=0.4,
            verbose=False,
        )
        result = results[0]

        detections = []
        events = []
        current_person_ids = set()
        machinery = []

        cv2.rectangle(frame, (zone_x1, zone_y1), (zone_x2, zone_y2), (0, 0, 255), 3)
        cv2.putText(
            frame,
            "RESTRICTED SAFETY ZONE",
            (zone_x1, max(zone_y1 - 10, 25)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (0, 0, 255),
            2,
        )

        if result.boxes is not None:
            boxes = result.boxes

            # first pass: collect machinery centroids for proximity checks
            for i in range(len(boxes)):
                class_id = int(boxes.cls[i].cpu().item())
                class_name = self.model.names[class_id]
                if class_name in MACHINERY_CLASSES:
                    mx1, my1, mx2, my2 = boxes.xyxy[i].cpu().numpy().astype(int)
                    machinery.append((class_name, (int(mx1 + mx2) / 2), int((my1 + my2) / 2)))

            for i in range(len(boxes)):
                class_id = int(boxes.cls[i].cpu().item())
                class_name = self.model.names[class_id]
                confidence = float(boxes.conf[i].cpu().item())

                track_id = None
                if boxes.id is not None:
                    track_id = int(boxes.id[i].cpu().item())

                x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy().astype(int)

                detection = {
                    "class": class_name,
                    "confidence": round(confidence, 2),
                    "track_id": track_id,
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                }
                detections.append(detection)

                if class_name == "person" and track_id is not None:
                    current_person_ids.add(track_id)
                    center_x = int((x1 + x2) / 2)
                    center_y = int((y1 + y2) / 2)
                    box_w = max(x2 - x1, 1)
                    box_h = max(y2 - y1, 1)
                    aspect = box_h / box_w

                    inside_zone = (
                        zone_x1 <= center_x <= zone_x2
                        and zone_y1 <= center_y <= zone_y2
                    )

                    if inside_zone:
                        self.person_zone_frames[track_id] = self.person_zone_frames.get(track_id, 0) + 1

                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                        cv2.putText(
                            frame,
                            f"WORKER #{track_id} - DANGER",
                            (x1, max(y1 - 10, 25)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            (0, 0, 255),
                            2,
                        )

                        if self.person_zone_frames[track_id] >= self.required_frames:
                            self._log_event(
                                events,
                                {
                                    "type": "RESTRICTED_ZONE_ENTRY",
                                    "track_id": track_id,
                                    "severity": "HIGH",
                                    "risk_score": 78,
                                    "hazard": "Restricted zone exposure",
                                    "sif_mechanism": "Hazardous-area exposure",
                                    "message": f"Worker #{track_id} entered the restricted safety zone.",
                                    "timestamp": datetime.now().astimezone().isoformat(),
                                },
                            )

                            cv2.putText(
                                frame,
                                "SIF PRECURSOR DETECTED!",
                                (zone_x1, min(zone_y2 + 35, height - 20)),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                0.75,
                                (0, 0, 255),
                                3,
                            )
                    else:
                        self.person_zone_frames[track_id] = 0
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 200, 0), 2)
                        cv2.putText(
                            frame,
                            f"Worker #{track_id}",
                            (x1, max(y1 - 10, 25)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            (0, 200, 0),
                            2,
                        )

                    # --- fall / suspected injury -------------------------------
                    # A standing person is roughly 3-4x taller than wide. When
                    # the bbox collapses to roughly square the body has gone
                    # horizontal, which sustained over N frames indicates a fall.
                    if aspect < 1.2:
                        self.person_low_ratio_frames[track_id] = self.person_low_ratio_frames.get(track_id, 0) + 1
                    else:
                        self.person_low_ratio_frames[track_id] = 0

                    if self.person_low_ratio_frames.get(track_id, 0) >= self.required_frames:
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 4)
                        cv2.putText(
                            frame,
                            f"FALL SUSPECTED #{track_id}",
                            (x1, min(y2 + 20, height - 10)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.65,
                            (0, 0, 255),
                            2,
                        )
                        self._log_event(
                            events,
                            {
                                "type": "FALL_SUSPECTED",
                                "track_id": track_id,
                                "severity": "CRITICAL",
                                "risk_score": 95,
                                "hazard": "Fall / suspected injury",
                                "sif_mechanism": "Suspected incapacitation",
                                "message": f"Worker #{track_id} collapsed and remained down - possible fall injury.",
                                "timestamp": datetime.now().astimezone().isoformat(),
                            },
                        )

                    # --- unsafe proximity to machinery --------------------------
                    near = None
                    for m_name, m_x, m_y in machinery:
                        if abs(m_x - center_x) < width * 0.25 and abs(m_y - center_y) < height * 0.25:
                            near = m_name
                            break

                    if near:
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 165, 255), 3)
                        cv2.putText(
                            frame,
                            f"PROXIMITY: {near}",
                            (x1, max(y1 - 10, 25)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.55,
                            (0, 165, 255),
                            2,
                        )
                        self._log_event(
                            events,
                            {
                                "type": "UNSAFE_PROXIMITY",
                                "track_id": track_id,
                                "severity": "SERIOUS",
                                "risk_score": 65,
                                "hazard": f"Worker within unsafe distance of {near}",
                                "sif_mechanism": "Struck-by potential",
                                "message": f"Worker #{track_id} came within unsafe proximity of {near}.",
                                "timestamp": datetime.now().astimezone().isoformat(),
                            },
                        )

                    cv2.circle(frame, (center_x, center_y), 5, (255, 255, 0), -1)
                else:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 170, 0), 2)
                    label = f"{class_name} {confidence:.0%}"
                    if track_id is not None:
                        label += f" #{track_id}"

                    cv2.putText(
                        frame,
                        label,
                        (x1, max(y1 - 10, 25)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.55,
                        (255, 255, 255),
                        2,
                    )

        self._track_state_reset(current_person_ids)

        cv2.rectangle(frame, (0, 0), (width, 70), (20, 20, 20), -1)
        cv2.putText(frame, "OIL SIF PRECURSOR", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
        cv2.putText(frame, "YOLO + ByteTrack | AI CCTV", (20, 57), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

        self.latest_detections = detections
        if events:
            self.latest_events = (self.latest_events + events)[-self.max_event_log:]

        return frame

    # ------------------------------------------------------------------
    # STREAMING
    # ------------------------------------------------------------------

    def generate_frames(self):
        """
        MJPEG stream for the browser.

        Live camera -> frames are processed on the fly.
        Video file  -> the background worker owns the analysis, so replay the
                       annotated output it produced instead of re-reading the
                       source (which would fight the worker for the capture).
        """
        if not self.running and not (self.is_video_file and self.annotated_path):
            print("generate_frames called with no active source.")
            return

        if self.is_video_file:
            yield from self._replay_annotated()
            return

        while self.running:
            success, frame = self.camera.read()

            if not success:
                print("Unable to read CCTV frame.")
                self.running = False
                break

            self.frames_processed += 1
            processed_frame = self.process_frame(frame)
            success, buffer = cv2.imencode(
                ".jpg",
                processed_frame,
                [int(cv2.IMWRITE_JPEG_QUALITY), 80],
            )

            if not success:
                continue

            frame_bytes = buffer.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + frame_bytes
                + b"\r\n"
            )

    def _replay_annotated(self):
        """Stream the annotated copy of an analysed clip, once it is ready."""
        # Wait for the worker to produce the file rather than streaming nothing.
        for _ in range(300):
            if self.finished and self.annotated_path and os.path.isfile(self.annotated_path):
                break
            if not self.running and not (
                self.annotated_path and os.path.isfile(self.annotated_path)
            ):
                break
            time.sleep(0.2)

        if not self.annotated_path or not os.path.isfile(self.annotated_path):
            print("No annotated output available to stream.")
            return

        replay = cv2.VideoCapture(self.annotated_path)

        while True:
            success, frame = replay.read()
            if not success:
                break
            success, buffer = cv2.imencode(
                ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80]
            )
            if not success:
                continue
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + buffer.tobytes()
                + b"\r\n"
            )

        replay.release()

    # ------------------------------------------------------------------
    # SAFETY OUTPUT
    # ------------------------------------------------------------------

    def summary(self):
        """
        Aggregate the run into a single safety verdict for the UI / demo.

        Severity ladder: CRITICAL > SERIOUS > HIGH > CLEAR
        """
        counts = {}
        worst_rank = 0
        worst_score = 0
        rank = {"CLEAR": 0, "WARNING": 1, "HIGH": 2, "SERIOUS": 3, "CRITICAL": 4}

        for event in self.latest_events:
            etype = event.get("type", "EVENT")
            counts[etype] = counts.get(etype, 0) + 1
            severity = event.get("severity", "WARNING")
            if rank.get(severity, 1) > worst_rank:
                worst_rank = rank.get(severity, 1)
                worst_score = event.get("risk_score", 0)

        if worst_rank >= 4:
            verdict = "CRITICAL"
        elif worst_rank == 3:
            verdict = "SERIOUS"
        elif worst_rank == 2:
            verdict = "HIGH"
        elif worst_rank == 1:
            verdict = "WARNING"
        else:
            verdict = "CLEAR"

        if self.error:
            headline = f"Analysis failed: {self.error}"
        elif self.frames_processed == 0:
            headline = "No frames were analysed."
        elif verdict == "CLEAR":
            headline = (
                f"No safety precursor detected across {self.frames_processed} frames."
            )
        else:
            headline = (
                f"{len(self.latest_events)} safety precursor event(s) detected "
                f"across {self.frames_processed} frames."
            )

        progress = 0
        if self.total_frames:
            progress = min(round(self.frames_processed / self.total_frames * 100), 100)

        return {
            "source": self.source_name,
            "is_video_file": self.is_video_file,
            "running": self.running,
            "finished": self.finished,
            "error": self.error,
            "frames_processed": self.frames_processed,
            "total_frames": self.total_frames,
            "progress_percent": progress,
            "verdict": verdict,
            "risk_score": worst_score,
            "headline": headline,
            "violations": counts,
            "events": self.latest_events,
            "detections": self.latest_detections,
            "annotated_video": (
                f"/api/cctv/annotated?v={int(time.time())}"
                if self.annotated_path and os.path.isfile(self.annotated_path)
                else None
            ),
            "detectable_signals": [
                "Restricted zone intrusion",
                "Fall / suspected injury",
                "Unsafe proximity to machinery",
            ],
            "not_detectable": [
                "PPE (helmet/vest/gloves) - needs a custom-trained model",
                "Fire / smoke - needs a custom-trained model",
            ],
        }


cctv_engine = CCTVEngine()
