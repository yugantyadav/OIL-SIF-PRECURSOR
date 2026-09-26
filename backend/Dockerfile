FROM python:3.11-slim

WORKDIR /app

# ultralytics requires the GUI build of `opencv-python`, which dlopen()s the GL/X11
# libs below at import time. Without them the backend dies with
# "ImportError: libxcb.so.1: cannot open shared object file".
# ffmpeg is required by OpenCV's VIDEOIO backend to decode uploaded video files
# ("error: (-2) in function 'bool CvCapture_FFMPEG::open'" without it).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev libgomp1 \
    libgl1 libglib2.0-0 libxcb1 libxkbcommon0 libsm6 libxext6 libxrender1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only torch BEFORE requirements so ultralytics does not pull the
# CUDA build (torch + nvidia-cudnn + triton + cublas... ~4GB, unusable without
# an NVIDIA GPU and very slow to download).
ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --index-url ${TORCH_INDEX_URL} torch torchvision

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
