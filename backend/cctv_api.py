import base64
import os
import uuid

from fastapi import APIRouter, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, StreamingResponse

from cctv_engine import cctv_engine

router = APIRouter(prefix="/api/cctv", tags=["CCTV"])

# Uploaded clips land here. Matches the ./data:/data mount in docker-compose.yml
# so clips survive a container rebuild.
UPLOAD_DIR = os.getenv("CCTV_UPLOAD_DIR", "/data/cctv")

ALLOWED_SUFFIXES = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v"}
MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200 MB


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Accept a safety video clip, then immediately start analysing it.

    Multipart form field name must be `file`.
    """
    suffix = os.path.splitext(file.filename or "")[1].lower()

    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video type '{suffix}'. Allowed: {', '.join(sorted(ALLOWED_SUFFIXES))}",
        )

    payload = await file.read()

    if not payload:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Video too large ({len(payload) // (1024 * 1024)} MB). Max is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Prefix with a uuid so two uploads of `clip.mp4` never collide.
    stored_name = f"{uuid.uuid4().hex[:8]}_{os.path.basename(file.filename or 'clip')}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)

    with open(stored_path, "wb") as handle:
        handle.write(payload)

    try:
        cctv_engine.start(stored_path)
    except RuntimeError as exc:
        os.remove(stored_path)
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "success": True,
        "filename": file.filename,
        "stored_as": stored_name,
        "size_bytes": len(payload),
        "message": "Video uploaded and analysis started.",
    }


@router.websocket("/ws")
async def cctv_websocket(websocket: WebSocket):
    """
    Browser-webcam inference channel.

    The browser owns the webcam (this container has no camera device), so it
    opens this socket after getUserMedia() succeeds and pushes JPEG frames.
    Each frame is analysed and an annotated JPEG plus the detection payload is
    returned, so the overlay always matches the analysed frame exactly.
    """
    await websocket.accept()
    cctv_engine.start_external()
    conn_gen = cctv_engine.conn_gen
    frames = 0

    try:
        while True:
            message = await websocket.receive_bytes()

            if not message:
                continue

            result = cctv_engine.process_external_frame(message)

            if not result.get("ok"):
                await websocket.send_json({"ok": False, "error": result.get("error")})
                continue

            frames += 1
            await websocket.send_json(
                {
                    "ok": True,
                    "frame": frames,
                    "detections": result["detections"],
                    "events": result["events"],
                    "all_events": result["all_events"],
                    "zone": result["zone"],
                    "frames_processed": result["frames_processed"],
                    "annotated_jpeg": base64.b64encode(result["annotated_jpeg"]).decode("ascii")
                    if result["annotated_jpeg"]
                    else None,
                }
            )
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        print(f"CCTV websocket closed: {exc}")
    finally:
        # Only tear down if this connection is still the current session — a
        # stale socket (tab refresh, second tab) must not stop a newer one.
        if cctv_engine.conn_gen == conn_gen:
            cctv_engine.stop()
        try:
            await websocket.close()
        except RuntimeError:
            pass


@router.post("/start")
def start_cctv(source: str = "0"):
    """
    Start analysis.

    `source` is either a camera index ("0", "1") or a path to a video file that
    already exists on the server. Use /upload to bring a file in first.
    """
    try:
        if source.isdigit():
            name = cctv_engine.start(int(source))
        else:
            name = cctv_engine.start(source)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {"success": True, "message": f"CCTV started on {name}", "source": name}


@router.post("/stop")
def stop_cctv():
    cctv_engine.stop()
    return {"success": True, "message": "CCTV stopped"}


@router.get("/status")
def cctv_status():
    return {
        "running": cctv_engine.running,
        "source": cctv_engine.source_name,
        "is_video_file": cctv_engine.is_video_file,
        "frames_processed": cctv_engine.frames_processed,
        "total_frames": cctv_engine.total_frames,
        "finished": cctv_engine.finished,
    }


@router.get("/summary")
def cctv_summary():
    """Full safety verdict for the analysed clip."""
    return cctv_engine.summary()


@router.get("/annotated")
def cctv_annotated():
    """The annotated (overlaid) copy of the analysed clip."""
    path = cctv_engine.annotated_path

    if not path or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="No annotated video available yet.")

    return FileResponse(path, media_type="video/mp4")


@router.get("/stream")
def cctv_stream():
    if not cctv_engine.running:
        raise HTTPException(
            status_code=409,
            detail="No active video source. Upload a clip or start a camera first.",
        )

    return StreamingResponse(
        cctv_engine.generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.get("/events")
def cctv_events():
    return {
        "events": cctv_engine.latest_events,
        "detections": cctv_engine.latest_detections,
    }
