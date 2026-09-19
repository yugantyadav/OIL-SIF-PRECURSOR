import cv2
import time
from ultralytics import YOLO
from datetime import datetime

class CCTVEngine:
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

    def start(self, source=0):
        if self.running:
            return

        self.camera = cv2.VideoCapture(source)

        if not self.camera.isOpened():
            raise RuntimeError("Unable to open CCTV camera.")

        self.running = True
        self.latest_events = []
        self.latest_detections = []
        print("CCTV started.")

    def stop(self):
        self.running = False

        if self.camera is not None:
            self.camera.release()
            self.camera = None

        self.latest_events = []
        self.latest_detections = []
        self.person_zone_frames = {}
        print("CCTV stopped.")

    def get_zone(self, width, height):
        x1 = int(width * 0.28)
        y1 = int(height * 0.20)
        x2 = int(width * 0.72)
        y2 = int(height * 0.82)
        return x1, y1, x2, y2

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
                            current_time = time.time()

                            if current_time - self.last_alert_time > self.alert_cooldown:
                                event = {
                                    "type": "RESTRICTED_ZONE_ENTRY",
                                    "track_id": track_id,
                                    "severity": "HIGH",
                                    "risk_score": 78,
                                    "hazard": "Restricted zone exposure",
                                    "sif_mechanism": "Hazardous-area exposure",
                                    "message": f"Worker #{track_id} entered the restricted safety zone.",
                                    "timestamp": datetime.now().astimezone().isoformat(),
                                }
                                events.append(event)
                                self.last_alert_time = current_time

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

        old_ids = set(self.person_zone_frames.keys()) - current_person_ids
        for old_id in old_ids:
            del self.person_zone_frames[old_id]

        cv2.rectangle(frame, (0, 0), (width, 70), (20, 20, 20), -1)
        cv2.putText(frame, "OIL SIF PRECURSOR", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
        cv2.putText(frame, "YOLO + ByteTrack | AI CCTV", (20, 57), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

        self.latest_detections = detections
        if events:
            self.latest_events = events

        return frame

    def generate_frames(self):
        if not self.running:
            self.start(0)

        while self.running:
            success, frame = self.camera.read()

            if not success:
                print("Unable to read CCTV frame.")
                break

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


cctv_engine = CCTVEngine()