# Beyond Sedlis Nomogram - Recurrence Risk Calculator

A web-based calculator for estimating cervical cancer recurrence risk based on the "Beyond Sedlis" criteria from Table 3 of the 2021 study.

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- **PDF Parsing**: Automatically extracts Table 3 parameters from uploaded PDF documents
- **Risk Calculation**: Calculates recurrence risk using Cox proportional hazards model
- **Interactive Interface**: Clean, responsive web interface built with vanilla HTML/CSS/JS
- **Real-time Results**: Immediate risk percentage with risk level categorization
- **Transparent Calculations**: Detailed breakdown of all intermediate values

## Project Structure

```
beyond-sedlis/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic data models
│   ├── pdf_parser.py        # PDF Table 3 extraction logic
│   ├── risk_calculator.py   # Risk calculation engine
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Main web interface
│   ├── styles.css           # Styling
│   └── app.js               # Frontend JavaScript
├── examples/                # Example PDF files
├── logs/                    # Application logs
├── uploads/                 # Uploaded PDF storage
└── README.md
```

## Installation

### Prerequisites

- Python 3.9 or higher
- pip package manager

### Backend Setup

1. Navigate to the project directory:
```bash
cd /home/jx1/projects/pdf/beyond-sedlis
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### Running the Application

1. Start the FastAPI server:
```bash
cd backend
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

2. Open your browser and navigate to:
```
http://localhost:8000
```

The API documentation will be available at:
```
http://localhost:8000/docs
```

## API Endpoints

### POST /api/upload
Upload and parse a PDF file to extract Table 3 parameters.

**Request:**
- Content-Type: multipart/form-data
- Body: `file` (PDF document, max 20MB)

**Response:**
```json
{
  "success": true,
  "message": "PDF parsed successfully",
  "model_id": "uuid-string",
  "metadata": {
    "source_file": "document.pdf",
    "variables": [...],
    "coefficients": {...}
  }
}
```

### POST /api/predict
Calculate recurrence risk based on input parameters.

**Request:**
- Content-Type: application/x-www-form-urlencoded
- Fields:
  - `vascular_invasion`: "Yes" | "No"
  - `invasion_depth`: number (mm)
  - `tumor_size`: number (cm)
  - `tissue_type`: "SCC" | "AC"
  - `model_id`: string (optional)

**Response:**
```json
{
  "success": true,
  "recurrence_risk_percent": 15.5,
  "risk_level": "Intermediate",
  "intermediate_values": {...},
  "explanation": "..."
}
```

### GET /api/models
List all available parsed models.

### GET /api/model/{model_id}
Get metadata for a specific model.

## Risk Calculation Methodology

The calculator uses a Cox proportional hazards model with coefficients derived from Table 3 hazard ratios:

### Variables
- **Vascular Invasion**: Yes/No (HR = 2.15)
- **Deep Stromal Invasion**: ≥10mm (HR = 2.51)
- **Tumor Size**: Continuous per cm (HR = 1.35)
- **Histologic Type**: SCC vs AC (HR = 0.43 for SCC)

### Risk Categories
- **Low**: < 10% risk
- **Intermediate**: 10-30% risk
- **High**: > 30% risk

### Formula
```
Linear Predictor = β₁×VI + β₂×DSI + β₃×Size + β₄×Type + Intercept
Risk = 1 / (1 + exp(-Linear Predictor)) × 100%
```

Where β values are natural logs of the hazard ratios.

## PDF Requirements

For automatic Table 3 parsing, PDFs should contain:

1. A table titled "Table 3" or "Univariate and Multivariate Analysis"
2. Variables including:
   - Vascular Invasion
   - Deep Stromal Invasion / Stromal Invasion
   - Tumor Size
   - Histologic Type / Cell type
3. Statistical values: HR (Hazard Ratio), 95% CI, P-value

If parsing fails, the system falls back to default values from the Beyond Sedlis paper.

## Deployment to GitHub Pages

### Option 1: Using GitHub Actions for Full Deployment

1. Create a new GitHub repository
2. Push the project to GitHub
3. Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Deploy
        run: echo "Configure your hosting provider"
```

### Option 2: Frontend-Only GitHub Pages (Using Existing API)

1. Deploy frontend to GitHub Pages:
```bash
cd frontend
# Deploy contents to gh-pages branch
```

2. Update `app.js` API_BASE to point to your hosted backend

### Option 3: Full Stack on Render/Railway

For a complete solution with both frontend and backend:

1. Create `render.yaml` or `railway.json`
2. Connect your GitHub repository
3. Deploy automatically

## Development

### Adding New Variables

1. Update `models.py` with new fields
2. Modify `risk_calculator.py` calculation logic
3. Update frontend `index.html` form
4. Adjust `app.js` to handle new inputs

### Testing

```bash
# Run tests (if implemented)
cd backend
pytest

# Test API manually
curl -X POST "http://localhost:8000/api/predict" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "vascular_invasion=Yes&invasion_depth=15&tumor_size=4&tissue_type=AC"
```

## Limitations

1. **PDF Parsing**: Success depends on PDF structure and formatting
2. **Baseline Risk**: Calibrated for absolute risk estimation
3. **Model Scope**: Valid only for early-stage cervical cancer post-radical hysterectomy
4. **Clinical Use**: For educational purposes only; not a substitute for professional medical advice

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Citation

If you use this calculator in research, please cite:

```
"Beyond Sedlis: A Risk-Adapted Management Approach for Cervical Cancer
Patients Treated with Radical Hysterectomy" (2021)
```

## Contact

For questions or issues, please open a GitHub issue.

---

**Disclaimer**: This tool is for educational and research purposes only. Always consult with qualified healthcare professionals for medical decisions.
