# FastAPI Main Application
import os
import uuid
import logging
import shutil
from datetime import datetime
from typing import Dict, Optional
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import ValidationError

from backend.models import (
    RiskPredictionRequest,
    RiskPredictionResponse,
    UploadResponse,
    Table3Metadata
)
from backend.pdf_parser import parse_pdf_table3
from backend.risk_calculator import calculate_risk

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Beyond Sedlis Nomogram Risk Calculator",
    description="Calculate recurrence risk based on Table 3 parameters",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store parsed models in memory (in production, use a database)
models_store: Dict[str, Table3Metadata] = {}

# Create necessary directories
UPLOAD_DIR = Path("uploads")
TEMP_DIR = Path("temp")
LOG_DIR = Path("logs")
for dir_path in [UPLOAD_DIR, TEMP_DIR, LOG_DIR]:
    dir_path.mkdir(exist_ok=True)

# Mount static files for frontend
frontend_path = Path(__file__).parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")


@app.get("/")
async def root():
    """Root endpoint - serve the frontend."""
    index_path = frontend_path / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "Beyond Sedlis Nomogram Risk Calculator API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/api/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload and parse a PDF file to extract Table 3.

    Args:
        file: Uploaded PDF file

    Returns:
        UploadResponse with parsed metadata
    """
    # Validate file type
    if not file.content_type == "application/pdf":
        logger.warning(f"Invalid file type uploaded: {file.content_type}")
        return UploadResponse(
            success=False,
            message=f"Invalid file type: {file.content_type}. Only PDF files are supported.",
            warnings=[]
        )

    # Check file size (20MB limit)
    MAX_FILE_SIZE = 20 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        logger.warning(f"File too large: {len(content)} bytes")
        return UploadResponse(
            success=False,
            message=f"File too large ({len(content) / 1024 / 1024:.1f}MB). Maximum size is 20MB.",
            warnings=[]
        )

    # Save to temporary file
    temp_file_path = None
    model_id = str(uuid.uuid4())

    try:
        # Create temporary file
        temp_file_path = TEMP_DIR / f"{model_id}_{file.filename}"
        with open(temp_file_path, "wb") as f:
            f.write(content)

        logger.info(f"Processing PDF upload: {file.filename} ({len(content)} bytes)")

        # Parse PDF to extract Table 3
        success, metadata, warnings = parse_pdf_table3(str(temp_file_path))

        if not success:
            logger.error(f"Failed to parse PDF: {warnings}")
            return UploadResponse(
                success=False,
                message="Failed to parse PDF. Please ensure it contains Table 3.",
                warnings=warnings
            )

        # Store metadata
        models_store[model_id] = metadata

        # Save uploaded file permanently
        final_path = UPLOAD_DIR / f"{model_id}_{file.filename}"
        shutil.copy(str(temp_file_path), str(final_path))

        logger.info(f"Successfully parsed PDF, model_id: {model_id}")

        return UploadResponse(
            success=True,
            message="PDF parsed successfully. Table 3 parameters extracted.",
            model_id=model_id,
            metadata=metadata,
            warnings=warnings
        )

    except Exception as e:
        logger.error(f"Error processing upload: {e}", exc_info=True)
        return UploadResponse(
            success=False,
            message=f"Error processing file: {str(e)}",
            warnings=[]
        )

    finally:
        # Clean up temporary file
        if temp_file_path and temp_file_path.exists():
            try:
                temp_file_path.unlink()
            except Exception as e:
                logger.warning(f"Failed to delete temp file: {e}")


@app.post("/api/predict", response_model=RiskPredictionResponse)
async def predict_risk(
    vascular_invasion: str = Form(...),
    invasion_depth: float = Form(...),
    tumor_size: float = Form(...),
    tissue_type: str = Form(...),
    model_id: Optional[str] = Form(None)
):
    """
    Calculate recurrence risk based on input parameters.

    Args:
        vascular_invasion: Vascular invasion status (Yes/No)
        invasion_depth: Invasion depth in mm
        tumor_size: Tumor size in cm
        tissue_type: Histologic type (SCC/AC)
        model_id: Optional model ID from uploaded PDF

    Returns:
        RiskPredictionResponse with calculated risk
    """
    try:
        # Validate and create request
        request = RiskPredictionRequest(
            vascular_invasion=vascular_invasion,
            invasion_depth=invasion_depth,
            tumor_size=tumor_size,
            tissue_type=tissue_type,
            model_id=model_id
        )

        # Get model metadata
        if model_id and model_id in models_store:
            metadata = models_store[model_id]
        else:
            # Use default model from examples/ if no model_id provided
            default_pdf = Path(__file__).resolve().parent.parent / "examples" / "2021 Beyond Sedlis.pdf"
            if not default_pdf.exists():
                return RiskPredictionResponse(
                    success=False,
                    error="No model selected",
                    explanation="Upload a PDF first to get a model, or place '2021 Beyond Sedlis.pdf' in the examples/ directory."
                )
            logger.info("No model_id provided, using default model from examples/")
            _, metadata, _ = parse_pdf_table3(str(default_pdf))

        # Calculate risk
        result = calculate_risk(request, metadata)

        logger.info(
            f"Risk calculation: vascular_invasion={vascular_invasion}, "
            f"invasion_depth={invasion_depth}, tumor_size={tumor_size}, "
            f"tissue_type={tissue_type}, result={result.recurrence_risk_percent}%"
        )

        return result

    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        return RiskPredictionResponse(
            success=False,
            error=f"Invalid input: {str(e)}",
            explanation="Please check your input values."
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return RiskPredictionResponse(
            success=False,
            error=str(e),
            explanation="An error occurred during risk calculation."
        )


@app.get("/api/model/{model_id}")
async def get_model(model_id: str):
    """Get model metadata by ID."""
    if model_id not in models_store:
        raise HTTPException(status_code=404, detail="Model not found")
    return models_store[model_id]


@app.get("/api/models")
async def list_models():
    """List all available models."""
    return {
        "models": [
            {
                "id": model_id,
                "source_file": metadata.source_file,
                "parse_timestamp": metadata.parse_timestamp,
                "variables": [v.name for v in metadata.variables]
            }
            for model_id, metadata in models_store.items()
        ]
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
