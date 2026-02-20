# Example PDFs

This directory should contain example PDF files for testing the Table 3 parser.

## Required PDF Format

For successful parsing, PDFs should contain:

### Table 3 Structure

A table with the following columns:
- Variable/Parameter names
- Hazard Ratio (HR)
- 95% Confidence Interval (CI)
- P-value

### Required Variables

1. **Vascular Invasion** (binary: Yes/No)
2. **Deep Stromal Invasion** (binary or continuous depth in mm)
3. **Tumor Size** (continuous in cm)
4. **Histologic Type** (SCC vs AC comparison)

## Adding Example PDFs

Place PDF files that match the required format in this `examples/` directory. If you add a file named `2021 Beyond Sedlis.pdf`, the API will use it as the default model when no model is selected after an upload.

To use a different source path when running the app, you can set the optional environment variable before starting:
```bash
export EXAMPLE_PDF_SOURCE="/path/to/your/2021 Beyond Sedlis.pdf"
./run.sh
```

## Testing

Upload example PDFs through the web interface to test:
- PDF parsing accuracy
- Parameter extraction
- Risk calculation consistency
