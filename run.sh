#!/bin/bash
# Startup script for Beyond Sedlis Nomogram Calculator

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Beyond Sedlis Nomogram Calculator"
echo "========================================"
echo ""

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}Python version: $PYTHON_VERSION${NC}"

# Create necessary directories
echo "Creating directories..."
mkdir -p backend/logs backend/uploads backend/temp

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
cd backend
pip install -q -r requirements.txt
cd ..

# Copy example PDF if not present
if [ ! -f "examples/2021 Beyond Sedlis.pdf" ]; then
    echo "Copying example PDF..."
    cp "/home/jx1/projects/pdf/2021 Beyond Sedlis.pdf" examples/ 2>/dev/null || echo "Warning: Example PDF not found"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Starting server..."
echo ""
echo "========================================"
echo "Application will be available at:"
echo "  http://localhost:8000"
echo ""
echo "API documentation:"
echo "  http://localhost:8000/docs"
echo "========================================"
echo ""

# Start the server
cd backend
python main.py
