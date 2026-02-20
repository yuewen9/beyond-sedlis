# Pydantic models for request/response validation
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum


class TissueType(str, Enum):
    """Histologic tissue types"""
    SCC = "SCC"
    AC = "AC"


class VascularInvasion(str, Enum):
    """Vascular invasion status"""
    YES = "Yes"
    NO = "No"


class RiskPredictionRequest(BaseModel):
    """Request model for risk prediction"""
    vascular_invasion: VascularInvasion = Field(..., description="Vascular invasion status")
    invasion_depth: float = Field(..., description="Invasion depth in mm or category value", ge=0)
    tumor_size: float = Field(..., description="Tumor size in cm", ge=0)
    tissue_type: TissueType = Field(..., description="Histologic type (SCC or AC)")
    model_id: Optional[str] = Field(None, description="Model ID from parsed PDF")


class VariableDefinition(BaseModel):
    """Definition of a variable in the nomogram"""
    name: str
    display_name: str
    type: str  # 'binary', 'categorical', 'continuous'
    options: Optional[List[str]] = None
    categories: Optional[Dict[str, float]] = None  # For categorical with point values
    coefficient: Optional[float] = None
    unit: Optional[str] = None


class Table3Metadata(BaseModel):
    """Metadata extracted from Table 3"""
    source_file: str
    parse_timestamp: str
    variables: List[VariableDefinition]
    calculation_type: str  # 'logistic', 'cox', 'points'
    intercept: Optional[float] = None
    baseline_hazard: Optional[float] = None
    coefficients: Dict[str, float] = {}
    point_mappings: Optional[Dict[str, Dict[str, float]]] = None
    total_points_to_risk: Optional[Dict[float, float]] = None
    notes: List[str] = []


class UploadResponse(BaseModel):
    """Response for PDF upload"""
    success: bool
    message: str
    model_id: Optional[str] = None
    metadata: Optional[Table3Metadata] = None
    warnings: List[str] = []


class RiskPredictionResponse(BaseModel):
    """Response for risk prediction"""
    success: bool
    recurrence_risk_percent: Optional[float] = None
    risk_level: Optional[str] = None
    intermediate_values: Dict[str, Any] = {}
    explanation: str
    warnings: List[str] = []
    error: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response"""
    success: bool = False
    error: str
    detail: Optional[str] = None
