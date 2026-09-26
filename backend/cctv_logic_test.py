"""
Verify the CCTV detection logic (restricted-zone entry, fall, unsafe proximity)
and the summary verdict, using fabricated boxes fed through the REAL
process_frame().

This does not measure YOLO accuracy - it verifies OUR geometry, thresholds,
event emission and verdict aggregation.

Run inside the container:
    docker compose exec -T backend pytest cctv_logic_test.py -v
"""
import sys
from pathlib import Path

import numpy as np
import torch

# Works from inside the image (/app) and from a local clone (backend/).
_HERE = Path(__file__).resolve().parent
for _root in (Path("/app"), _HERE):
    if (_root / "cctv_engine.py").exists() and str(_root) not in sys.path:
        sys.path.insert(0, str(_root))

from cctv_engine import CCTVEngine

W, H = 640, 480


class FakeBoxes:
    """Stand-in for ultralytics' boxes, exposing just what process_frame reads."""

    def __init__(self, rows):
        # rows: list of (class_id, conf, track_id, x1, y1, x2, y2)
        self.rows = rows
        self.cls = torch.tensor([r[0] for r in rows], dtype=torch.float32)
        self.conf = torch.tensor([r[1] for r in rows], dtype=torch.float32)
        self.id = torch.tensor([r[2] for r in rows], dtype=torch.float32)
        self.xyxy = torch.tensor(
            [[r[3], r[4], r[5], r[6]] for r in rows], dtype=torch.float32
        )

    def __len__(self):
        return len(self.rows)


class FakeResult:
    def __init__(self, boxes):
        self.boxes = boxes


class FakeModel:
    names = {0: "person", 2: "car"}

    def __init__(self, rows):
        self.rows = rows

    def track(self, frame, **kwargs):
        return [FakeResult(FakeBoxes(self.rows))]


def _build_engine(rows, frames):
    """CCTVEngine without the YOLO model load, wired for a synthetic feed."""
    engine = CCTVEngine.__new__(CCTVEngine)
    engine.model = FakeModel(rows)
    engine.camera = None
    engine.running = True
    engine.latest_events = []
    engine.latest_detections = []
    engine.last_alert_time = 0
    engine.alert_cooldown = 0
    engine.person_zone_frames = {}
    engine.required_frames = 3
    engine.source = "fake.mp4"
    engine.source_name = "fake.mp4"
    engine.is_video_file = True
    engine.total_frames = frames
    engine.fps = 5
    engine.frames_processed = 0
    engine.finished = False
    engine.error = None
    engine.person_low_ratio_frames = {}
    engine.max_event_log = 100
    engine.analysis_thread = None
    engine.annotated_path = None
    return engine


def _run(rows, frames):
    engine = _build_engine(rows, frames)
    for _ in range(frames):
        engine.process_frame(np.zeros((H, W, 3), dtype=np.uint8))
        engine.frames_processed += 1
    engine.finished = True
    engine.running = False
    return engine, engine.summary(), {e["type"] for e in engine.latest_events}


# Restricted zone is x 28-72% (179-460), y 20-82% (96-393) of a 640x480 frame.


def test_person_inside_restricted_zone_raises_high():
    # Tall box, centroid inside the zone -> HIGH.
    _, summary, types = _run(rows=[(0, 0.9, 1, 250, 120, 330, 380)], frames=6)
    assert "RESTRICTED_ZONE_ENTRY" in types, types
    assert summary["verdict"] == "HIGH", summary
    assert summary["risk_score"] > 0


def test_collapsed_person_raises_critical():
    # Box wider than tall (aspect < 1.2) for enough frames -> FALL_SUSPECTED.
    _, summary, types = _run(rows=[(0, 0.9, 1, 100, 200, 400, 320)], frames=6)
    assert "FALL_SUSPECTED" in types, types
    assert summary["verdict"] == "CRITICAL", summary


def test_worker_beside_vehicle_raises_serious():
    rows = [(0, 0.9, 1, 60, 100, 140, 380), (2, 0.9, 2, 160, 150, 320, 300)]
    _, summary, types = _run(rows=rows, frames=6)
    assert "UNSAFE_PROXIMITY" in types, types
    assert summary["verdict"] == "SERIOUS", summary


def test_empty_frame_is_clear():
    _, summary, types = _run(rows=[], frames=3)
    assert types == set(), types
    assert summary["verdict"] == "CLEAR", summary
    assert summary["risk_score"] == 0, summary
