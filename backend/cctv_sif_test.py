import cv2
from ultralytics import YOLO
import time

# ============================================================
# OIL SIF PRECURSOR - CCTV SAFETY TEST
# YOLO + ByteTrack + Restricted Zone
# ============================================================

# Load YOLO model
model = YOLO("yolo11n.pt")

# Open webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("ERROR: Could not open webcam.")
    exit()

# ------------------------------------------------------------
# Restricted safety zone
# These coordinates are for a 640x480 webcam frame.
# ------------------------------------------------------------

ZONE_X1 = 180
ZONE_Y1 = 100
ZONE_X2 = 460
ZONE_Y2 = 400

# Number of frames person must remain inside zone
# before generating an alert
REQUIRED_FRAMES = 10

person_zone_frames = {}

last_alert_time = 0
ALERT_COOLDOWN = 5


while True:

    success, frame = cap.read()

    if not success:
        print("ERROR: Could not read camera frame.")
        break

    # --------------------------------------------------------
    # YOLO + ByteTrack
    # --------------------------------------------------------

    results = model.track(
        frame,
        persist=True,
        tracker="bytetrack.yaml",
        conf=0.4,
        verbose=False
    )

    result = results[0]

    # --------------------------------------------------------
    # Draw restricted zone
    # --------------------------------------------------------

    cv2.rectangle(
        frame,
        (ZONE_X1, ZONE_Y1),
        (ZONE_X2, ZONE_Y2),
        (0, 0, 255),
        3
    )

    cv2.putText(
        frame,
        "RESTRICTED SAFETY ZONE",
        (ZONE_X1, ZONE_Y1 - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.65,
        (0, 0, 255),
        2
    )

    current_person_ids = set()

    # --------------------------------------------------------
    # Process detections
    # --------------------------------------------------------

    if result.boxes is not None:

        boxes = result.boxes

        for i in range(len(boxes)):

            class_id = int(
                boxes.cls[i].cpu().item()
            )

            class_name = model.names[class_id]

            # We only care about people
            if class_name != "person":
                continue

            # Bounding box
            x1, y1, x2, y2 = (
                boxes.xyxy[i]
                .cpu()
                .numpy()
                .astype(int)
            )

            # Tracking ID
            track_id = None

            if boxes.id is not None:
                track_id = int(
                    boxes.id[i].cpu().item()
                )

            if track_id is None:
                continue

            current_person_ids.add(track_id)

            # ------------------------------------------------
            # Person center point
            # ------------------------------------------------

            center_x = int((x1 + x2) / 2)
            center_y = int((y1 + y2) / 2)

            # ------------------------------------------------
            # Check whether person is inside zone
            # ------------------------------------------------

            inside_zone = (
                ZONE_X1 <= center_x <= ZONE_X2
                and
                ZONE_Y1 <= center_y <= ZONE_Y2
            )

            # ------------------------------------------------
            # Person inside restricted zone
            # ------------------------------------------------

            if inside_zone:

                person_zone_frames[track_id] = (
                    person_zone_frames.get(track_id, 0) + 1
                )

                # Red bounding box
                box_color = (0, 0, 255)

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    box_color,
                    3
                )

                cv2.putText(
                    frame,
                    f"WORKER #{track_id} - DANGER",
                    (x1, max(y1 - 10, 25)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 0, 255),
                    2
                )

                # ------------------------------------------------
                # SIF PRECURSOR
                # ------------------------------------------------

                if (
                    person_zone_frames[track_id]
                    >= REQUIRED_FRAMES
                ):

                    current_time = time.time()

                    if (
                        current_time - last_alert_time
                        > ALERT_COOLDOWN
                    ):

                        print()
                        print("=" * 60)
                        print("🚨 SIF PRECURSOR DETECTED")
                        print("=" * 60)
                        print(
                            f"Worker ID: #{track_id}"
                        )
                        print(
                            "Hazard: Restricted zone exposure"
                        )
                        print(
                            "SIF Mechanism: Hazardous-area exposure"
                        )
                        print(
                            "Risk Level: HIGH"
                        )
                        print(
                            "Risk Score: 78%"
                        )
                        print(
                            "Action: Remove worker from restricted zone"
                        )
                        print("=" * 60)
                        print()

                        last_alert_time = current_time

                    cv2.putText(
                        frame,
                        "SIF PRECURSOR!",
                        (ZONE_X1, ZONE_Y2 + 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.8,
                        (0, 0, 255),
                        3
                    )

            else:

                # Reset exposure counter when worker leaves
                person_zone_frames[track_id] = 0

                # Normal bounding box
                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2
                )

                cv2.putText(
                    frame,
                    f"Worker #{track_id}",
                    (x1, max(y1 - 10, 25)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2
                )

            # ------------------------------------------------
            # Display tracking ID
            # ------------------------------------------------

            cv2.circle(
                frame,
                (center_x, center_y),
                5,
                (255, 255, 0),
                -1
            )

    # --------------------------------------------------------
    # Remove old tracking IDs
    # --------------------------------------------------------

    old_ids = set(person_zone_frames.keys()) - current_person_ids

    for old_id in old_ids:
        del person_zone_frames[old_id]

    # --------------------------------------------------------
    # Information panel
    # --------------------------------------------------------

    cv2.putText(
        frame,
        "OIL SIF PRECURSOR - AI CCTV",
        (20, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        "YOLO + ByteTrack",
        (20, 60),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (255, 255, 255),
        2
    )

    # --------------------------------------------------------
    # Show frame
    # --------------------------------------------------------

    cv2.imshow(
        "OIL SIF Precursor CCTV",
        frame
    )

    # Press Q to exit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


# ------------------------------------------------------------
# Cleanup
# ------------------------------------------------------------

cap.release()
cv2.destroyAllWindows()

print("CCTV system stopped.")