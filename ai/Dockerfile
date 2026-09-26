FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only torch BEFORE requirements. An inline `--index-url` on the
# torch line of requirements.txt only applies to torch itself, so its
# dependencies still resolve to the CUDA build (~4GB, unusable without an
# NVIDIA GPU). Pre-installing here pins the CPU build for the whole resolve.
ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --index-url ${TORCH_INDEX_URL} torch torchvision

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
