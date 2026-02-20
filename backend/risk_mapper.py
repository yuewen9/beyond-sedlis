# Risk Mapper - Normalize input values to match nomogram table categories
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


# DSI Category mappings
DSI_CATEGORY_ALIASES = {
    "superficial": "Superficial",
    "inner": "Superficial",
    "inner 1/3": "Superficial",
    "middle": "Middle",
    "middle 1/3": "Middle",
    "deep": "Deep",
    "outer": "Deep",
    "outer 1/3": "Deep",
}

# Tumor Size category mappings
SIZE_CATEGORY_ALIASES = {
    "<2cm": "<2cm",
    "<2": "<2cm",
    "0-2": "<2cm",
    "2-4cm": "2-4cm",
    "2-4": "2-4cm",
    "2-4 cm": "2-4cm",
    ">=4cm": "≥4cm",
    "≥4cm": "≥4cm",
    ">4cm": "≥4cm",
    ">4": "≥4cm",
    "4+": "≥4cm",
}

# Vascular Invasion mappings
VI_ALIASES = {
    "yes": "Yes",
    "y": "Yes",
    "positive": "Yes",
    "+": "Yes",
    "no": "No",
    "n": "No",
    "negative": "No",
    "-": "No",
    "none": "No",
}

# Tissue Type mappings
TYPE_ALIASES = {
    "scc": "SCC",
    "squamous": "SCC",
    "squamous cell carcinoma": "SCC",
    "ac": "AC",
    "adenocarcinoma": "AC",
}


def normalize_dsi(depth_mm: Optional[float], category: Optional[str]) -> str:
    """
    Normalize DSI input to standard category.

    Args:
        depth_mm: Invasion depth in mm (optional)
        category: Category string (optional)

    Returns:
        Standard category: "Superficial", "Middle", or "Deep"

    Raises:
        ValueError: If neither depth_mm nor category is provided
    """
    # Priority: use category if provided
    if category:
        category_clean = category.strip().lower()
        # Check aliases
        if category_clean in DSI_CATEGORY_ALIASES:
            return DSI_CATEGORY_ALIASES[category_clean]
        # Check if already standard
        if category in ["Superficial", "Middle", "Deep"]:
            return category
        # Try exact match (case insensitive)
        for standard in ["Superficial", "Middle", "Deep"]:
            if category_clean == standard.lower():
                return standard
        logger.warning(f"Unknown DSI category: {category}, attempting mapping")
        # Try partial match
        for key, value in DSI_CATEGORY_ALIASES.items():
            if key in category_clean or category_clean in key:
                return value

    # Map from depth value
    if depth_mm is not None:
        if depth_mm < 3:
            return "Superficial"
        elif depth_mm < 7:
            return "Middle"
        else:
            return "Deep"

    raise ValueError("DSI: 必须提供 depth_mm 或 category 之一")


def normalize_size(size_cm: Optional[float], category: Optional[str]) -> str:
    """
    Normalize tumor size input to standard category.

    Args:
        size_cm: Tumor size in cm (optional)
        category: Category string (optional)

    Returns:
        Standard category: "<2cm", "2-4cm", or "≥4cm"
    """
    # Priority: use category if provided
    if category:
        category_clean = category.strip()
        # Check aliases
        if category_clean.lower() in SIZE_CATEGORY_ALIASES:
            return SIZE_CATEGORY_ALIASES[category_clean.lower()]
        # Check if already standard
        if category in ["<2cm", "2-4cm", "≥4cm"]:
            return category

    # Map from size value
    if size_cm is not None:
        if size_cm < 2:
            return "<2cm"
        elif size_cm < 4:
            return "2-4cm"
        else:
            return "≥4cm"

    raise ValueError("Size: 必须提供 size_cm 或 category 之一")


def normalize_vascular_invasion(vi: str) -> str:
    """
    Normalize vascular invasion input to "Yes" or "No".

    Args:
        vi: Vascular invasion value

    Returns:
        "Yes" or "No"
    """
    vi_clean = vi.strip().lower()
    return VI_ALIASES.get(vi_clean, vi)


def normalize_tissue_type(tissue_type: str) -> str:
    """
    Normalize tissue type input to "SCC" or "AC".

    Args:
        tissue_type: Tissue type value

    Returns:
        "SCC" or "AC"
    """
    tt_clean = tissue_type.strip().lower()
    return TYPE_ALIASES.get(tt_clean, tissue_type)


def build_lookup_key(
    vascular_invasion: str,
    invasion_depth_category: str,
    tumor_size_category: str,
    tissue_type: str
) -> Tuple[str, str, str, str]:
    """
    Build normalized lookup key for risk table.

    Args:
        vascular_invasion: Raw vascular invasion value
        invasion_depth_category: Raw DSI category
        tumor_size_category: Raw size category
        tissue_type: Raw tissue type

    Returns:
        Tuple of normalized values (vi, dsi, size, type)
    """
    return (
        normalize_vascular_invasion(vascular_invasion),
        normalize_dsi(None, invasion_depth_category),
        normalize_size(None, tumor_size_category),
        normalize_tissue_type(tissue_type)
    )


def lookup_risk(
    risk_table: dict,
    vascular_invasion: str,
    invasion_depth: Optional[float],
    invasion_depth_category: Optional[str],
    tumor_size: Optional[float],
    tumor_size_category: Optional[str],
    tissue_type: str
) -> Optional[float]:
    """
    Look up risk from nomogram table using normalized inputs.

    Args:
        risk_table: Risk lookup table from Table 3
        vascular_invasion: Vascular invasion status
        invasion_depth: Depth in mm (optional)
        invasion_depth_category: DSI category (optional)
        tumor_size: Size in cm (optional)
        tumor_size_category: Size category (optional)
        tissue_type: Tissue type (SCC/AC)

    Returns:
        Risk percentage if found, None otherwise
    """
    try:
        # Normalize all inputs
        vi_norm = normalize_vascular_invasion(vascular_invasion)
        dsi_norm = normalize_dsi(invasion_depth, invasion_depth_category)
        size_norm = normalize_size(tumor_size, tumor_size_category)
        type_norm = normalize_tissue_type(tissue_type)

        # Build lookup key
        key = (vi_norm, dsi_norm, size_norm)

        # Look up in risk table
        if type_norm in risk_table:
            type_risk_table = risk_table[type_norm]
            if key in type_risk_table:
                return type_risk_table[key]

        logger.warning(f"Risk not found for: VI={vi_norm}, DSI={dsi_norm}, Size={size_norm}, Type={type_norm}")
        return None

    except Exception as e:
        logger.error(f"Error looking up risk: {e}")
        return None
