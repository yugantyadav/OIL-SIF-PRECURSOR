#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON=python3.12

echo "=== SIF Precursor Detection — Local Startup ==="

# --- Backend ---
echo "[1/4] Setting up backend..."
cd "$DIR/backend"
$PYTHON -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -q
deactivate

# --- AI ---
echo "[2/4] Setting up AI service..."
cd "$DIR/ai"
$PYTHON -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -q
deactivate

# --- Frontend ---
echo "[3/4] Installing frontend dependencies..."
cd "$DIR/frontend"
npm install --silent

# --- Start all services ---
echo "[4/4] Starting services..."

cd "$DIR/backend"
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
deactivate

cd "$DIR/ai"
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload &
AI_PID=$!
deactivate

cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=== All services running ==="
echo "  Frontend : http://localhost:5173"
echo "  Backend  : http://localhost:8000"
echo "  API Docs : http://localhost:8000/docs"
echo "  AI       : http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop all services."

trap "kill $BACKEND_PID $AI_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
