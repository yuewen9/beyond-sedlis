#!/bin/bash
# Quick start script using uv

echo "========================================"
echo "Beyond Sedlis Nomogram - uv Preview"
echo "========================================"
echo ""

# Create virtual environment if needed
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment with uv..."
    uv venv
fi

# Install dependencies
echo "Installing dependencies..."
uv pip install -r backend/requirements.txt -q

# Create necessary directories
mkdir -p backend/logs backend/uploads backend/temp

echo ""
echo "Starting server..."
echo ""
echo "========================================"
echo "Application available at:"
echo "  http://localhost:8000"
echo ""
echo "API documentation:"
echo "  http://localhost:8000/docs"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start server with auto-reload
cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
