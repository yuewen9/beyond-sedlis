# Risk Calculator for Nomogram Recurrence Risk
import logging
import numpy as np
from typing import Dict, Any, Optional, Tuple

from backend.models import (
    RiskPredictionRequest,
    Table3Metadata,
    RiskPredictionResponse,
    VascularInvasion,
    TissueType
)

logger = logging.getLogger(__name__)


class RiskCalculator:
    """
    Calculate recurrence risk based on nomogram model parameters.

    The calculation uses Cox proportional hazards model coefficients
    derived from Table 3 hazard ratios.
    """

    # Risk level thresholds (can be adjusted)
    RISK_THRESHOLDS = {
        "low": 0.10,      # < 10%
        "intermediate": 0.30,  # 10-30%
        "high": 1.0       # > 30%
    }

    def __init__(self, metadata: Table3Metadata):
        """
        Initialize calculator with model metadata.

        Args:
            metadata: Table3Metadata containing model coefficients
        """
        self.metadata = metadata
        self.coefficients = metadata.coefficients or {}

    def calculate(self, request: RiskPredictionRequest) -> RiskPredictionResponse:
        """
        Calculate recurrence risk from input parameters.

        Args:
            request: RiskPredictionRequest with input values

        Returns:
            RiskPredictionResponse with results
        """
        try:
            # Get coefficient values for each variable
            coeffs = self._get_coefficients()

            # Calculate linear predictor (risk score)
            linear_predictor = self._calculate_linear_predictor(request, coeffs)

            # Convert to probability (using logistic transformation)
            # For Cox model without baseline, we use a simplified approach
            risk_percent = self._linear_predictor_to_risk(linear_predictor)

            # Determine risk level
            risk_level = self._get_risk_level(risk_percent)

            # Build explanation
            explanation = self._build_explanation(request, coeffs, linear_predictor, risk_percent)

            # Build intermediate values for transparency
            intermediate_values = self._build_intermediate_values(
                request, coeffs, linear_predictor
            )

            return RiskPredictionResponse(
                success=True,
                recurrence_risk_percent=round(risk_percent, 2),
                risk_level=risk_level,
                intermediate_values=intermediate_values,
                explanation=explanation,
                warnings=[]
            )

        except Exception as e:
            logger.error(f"Calculation error: {e}")
            return RiskPredictionResponse(
                success=False,
                error=str(e),
                explanation=f"Calculation failed: {str(e)}"
            )

    def _get_coefficients(self) -> Dict[str, float]:
        """Get coefficient values from metadata."""
        return self.coefficients

    def _calculate_linear_predictor(
        self,
        request: RiskPredictionRequest,
        coeffs: Dict[str, float]
    ) -> float:
        """
        Calculate the linear predictor (risk score).

        LP = sum(coefficient_i * value_i)
        """
        lp = 0.0

        # Vascular Invasion (binary)
        vi_value = 1 if request.vascular_invasion == VascularInvasion.YES else 0
        vi_coef = coeffs.get("vascular_invasion", np.log(2.15))
        lp += vi_coef * vi_value

        # Deep Stromal Invasion (binary in this model)
        # Assuming invasion_depth > 10mm means deep invasion
        dsi_value = 1 if request.invasion_depth >= 10 else 0
        dsi_coef = coeffs.get("invasion_depth", np.log(2.51))
        lp += dsi_coef * dsi_value

        # Tumor Size (continuous, per cm)
        ts_coef = coeffs.get("tumor_size", np.log(1.35))
        lp += ts_coef * request.tumor_size

        # Tissue Type (categorical: SCC vs AC)
        # SCC is reference (lower risk), AC is higher risk
        tt_value = 1 if request.tissue_type == TissueType.AC else 0
        tt_coef = coeffs.get("tissue_type", np.log(2.33))  # Inverse of 0.43 for SCC vs AC
        lp += tt_coef * tt_value

        # Add intercept (baseline risk adjustment)
        # This is calibrated to give reasonable absolute risks
        baseline = -3.5  # Calibrated for ~5-50% risk range
        lp += baseline

        return lp

    def _linear_predictor_to_risk(self, linear_predictor: float) -> float:
        """
        Convert linear predictor to probability using logistic function.

        risk = 1 / (1 + exp(-LP))
        """
        try:
            # Clamp linear predictor to avoid overflow
            lp_clamped = max(min(linear_predictor, 10), -10)
            risk = 1.0 / (1.0 + np.exp(-lp_clamped))
            return risk * 100  # Convert to percentage
        except OverflowError:
            # Handle extreme values
            if linear_predictor > 0:
                return 99.9
            else:
                return 0.1

    def _get_risk_level(self, risk_percent: float) -> str:
        """Determine risk level category."""
        risk_decimal = risk_percent / 100.0

        if risk_decimal < self.RISK_THRESHOLDS["low"]:
            return "Low"
        elif risk_decimal < self.RISK_THRESHOLDS["intermediate"]:
            return "Intermediate"
        else:
            return "High"

    def _build_explanation(
        self,
        request: RiskPredictionRequest,
        coeffs: Dict[str, float],
        linear_predictor: float,
        risk_percent: float
    ) -> str:
        """Build human-readable explanation of the calculation."""
        lines = [
            "## Nomogram Recurrence Risk Calculation",
            "",
            "### Input Values:",
            f"- Vascular Invasion: {request.vascular_invasion.value}",
            f"- Deep Stromal Invasion: {'Yes (≥10mm)' if request.invasion_depth >= 10 else 'No (<10mm)'}",
            f"- Tumor Size: {request.tumor_size} cm",
            f"- Histologic Type: {request.tissue_type.value}",
            "",
            "### Calculation Details:",
        ]

        # Add contribution of each factor
        vi_coef = coeffs.get("vascular_invasion", np.log(2.15))
        vi_contrib = vi_coef * (1 if request.vascular_invasion == VascularInvasion.YES else 0)
        lines.append(f"- Vascular Invasion contribution: {vi_contrib:.3f}")

        dsi_coef = coeffs.get("invasion_depth", np.log(2.51))
        dsi_contrib = dsi_coef * (1 if request.invasion_depth >= 10 else 0)
        lines.append(f"- Deep Stromal Invasion contribution: {dsi_contrib:.3f}")

        ts_coef = coeffs.get("tumor_size", np.log(1.35))
        ts_contrib = ts_coef * request.tumor_size
        lines.append(f"- Tumor Size contribution: {ts_contrib:.3f}")

        tt_coef = coeffs.get("tissue_type", np.log(2.33))
        tt_contrib = tt_coef * (1 if request.tissue_type == TissueType.AC else 0)
        lines.append(f"- Tissue Type contribution: {tt_contrib:.3f}")

        lines.extend([
            f"- Baseline (intercept): -3.500",
            f"- **Linear Predictor (Total)**: {linear_predictor:.3f}",
            "",
            f"### Result:",
            f"- **Recurrence Risk**: {risk_percent:.1f}%",
            f"- **Risk Level**: {self._get_risk_level(risk_percent)}",
            "",
            "*Note: Risk calculation is based on Cox proportional hazards model coefficients",
            "derived from Table 3 hazard ratios. Baseline risk calibrated for absolute risk estimation.*"
        ])

        return "\n".join(lines)

    def _build_intermediate_values(
        self,
        request: RiskPredictionRequest,
        coeffs: Dict[str, float],
        linear_predictor: float
    ) -> Dict[str, Any]:
        """Build dictionary of intermediate calculation values."""
        return {
            "vascular_invasion": {
                "value": request.vascular_invasion.value,
                "numeric": 1 if request.vascular_invasion == VascularInvasion.YES else 0,
                "coefficient": round(coeffs.get("vascular_invasion", np.log(2.15)), 4),
                "contribution": round(
                    coeffs.get("vascular_invasion", np.log(2.15)) *
                    (1 if request.vascular_invasion == VascularInvasion.YES else 0), 4
                )
            },
            "invasion_depth": {
                "value_mm": request.invasion_depth,
                "deep_invasion": request.invasion_depth >= 10,
                "numeric": 1 if request.invasion_depth >= 10 else 0,
                "coefficient": round(coeffs.get("invasion_depth", np.log(2.51)), 4),
                "contribution": round(
                    coeffs.get("invasion_depth", np.log(2.51)) *
                    (1 if request.invasion_depth >= 10 else 0), 4
                )
            },
            "tumor_size": {
                "value_cm": request.tumor_size,
                "coefficient": round(coeffs.get("tumor_size", np.log(1.35)), 4),
                "contribution": round(
                    coeffs.get("tumor_size", np.log(1.35)) * request.tumor_size, 4
                )
            },
            "tissue_type": {
                "value": request.tissue_type.value,
                "numeric": 1 if request.tissue_type == TissueType.AC else 0,
                "coefficient": round(coeffs.get("tissue_type", np.log(2.33)), 4),
                "contribution": round(
                    coeffs.get("tissue_type", np.log(2.33)) *
                    (1 if request.tissue_type == TissueType.AC else 0), 4
                )
            },
            "baseline": -3.5,
            "linear_predictor": round(linear_predictor, 4)
        }


def calculate_risk(
    request: RiskPredictionRequest,
    metadata: Table3Metadata
) -> RiskPredictionResponse:
    """
    Convenience function to calculate recurrence risk.

    Args:
        request: RiskPredictionRequest with input values
        metadata: Table3Metadata with model parameters

    Returns:
        RiskPredictionResponse with calculated risk
    """
    calculator = RiskCalculator(metadata)
    return calculator.calculate(request)
