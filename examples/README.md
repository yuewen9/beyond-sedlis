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

## Example File

An example PDF is available at:
```
/home/jx1/projects/pdf/2021 Beyond Sedlis.pdf
```

You can copy this file to the examples directory:
```bash
cp "/home/jx1/projects/pdf/2021 Beyond Sedlis.pdf" examples/
```

## Testing

Upload example PDFs through the web interface to test:
- PDF parsing accuracy
- Parameter extraction
- Risk calculation consistency
