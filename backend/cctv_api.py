from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from cctv_engine import cctv_engine

router = APIRouter(prefix="/api/cctv", tags=["CCTV"])

@router.post("/start")
def start_cctv():
    try:
        cctv_engine.start(0)
        return {"success": True, "message": "CCTV started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
def stop_cctv():
    cctv_engine.stop()
    return {"success": True, "message": "CCTV stopped"}

@router.get("/status")
def cctv_status():
    return {"running": cctv_engine.running}

@router.get("/stream")
def cctv_stream():
    if not cctv_engine.running:
        try:
            cctv_engine.start(0)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

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