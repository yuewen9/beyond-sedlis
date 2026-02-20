# GitHub Pages Deployment Guide

This guide explains how to deploy the Beyond Sedlis Nomogram Calculator to GitHub Pages.

## Overview

The application has two parts:
1. **Frontend**: Static HTML/CSS/JS (can be hosted on GitHub Pages)
2. **Backend**: FastAPI server (needs separate hosting)

## Deployment Options

### Option 1: Frontend Only on GitHub Pages + External Backend

**Best for**: Free hosting with custom backend URL

#### Steps:

1. **Deploy Backend First**

   Choose a hosting provider for your FastAPI backend:
   - [Render](https://render.com) - Free tier available
   - [Railway](https://railway.app) - Easy deployment
   - [Fly.io](https://fly.io) - Global deployment
   - [Heroku](https://heroku.com) - Paid plans

   Example for Render:
   ```bash
   # Create a new web service
   # Connect your GitHub repo
   # Set build command: cd backend && pip install -r requirements.txt
   # Set start command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

2. **Update Frontend API URL**

   Edit `frontend/app-ghpages.js` and update:
   ```javascript
   const API_BASE = 'https://your-backend-url.onrender.com';
   ```

3. **Deploy to GitHub Pages**

   ```bash
   # Create gh-pages branch with just frontend
   git checkout --orphan gh-pages
   git rm -rf .
   cp -r frontend/* .
   cp frontend/index.html .
   cp frontend/styles.css .
   cp frontend/app-ghpages.js ./app.js

   git add .
   git commit -m "Deploy frontend to GitHub Pages"
   git push origin gh-pages
   ```

4. **Enable GitHub Pages**

   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` / `root`
   - Save

### Option 2: Complete Stack on Single Platform

**Best for**: Simpler deployment with both frontend and backend together

#### Using Render:

1. Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: beyond-sedlis-api
    env: python
    buildCommand: cd backend && pip install -r requirements.txt
    startCommand: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.9.0
```

2. Push to GitHub
3. Connect repository to Render
4. Deploy automatically

### Option 3: Static Export with Embedded Calculations

**Best for**: Pure static site without backend

For a fully client-side version, you can embed the calculation logic directly in JavaScript:

1. Extract the coefficients from Table 3
2. Implement calculation in `app.js` (no API calls needed)
3. Deploy purely static files to GitHub Pages

## Quick Start GitHub Pages Deploy

### Using GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v3

      - name: Setup Pages
        uses: actions/configure-pages@v3

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: './frontend'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

### Manual Deploy

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/beyond-sedlis.git
cd beyond-sedlis

# Copy frontend files to a subdirectory
mkdir -p docs
cp -r frontend/* docs/

# Commit and push
git add docs/
git commit -m "Add frontend for GitHub Pages"
git push origin main

# Enable GitHub Pages in repo settings:
# Settings → Pages → Source: docs folder
```

## Configuration Files

### CNAME (Custom Domain)

If you have a custom domain, create `frontend/CNAME`:
```
nomogram.yourdomain.com
```

### _config.yml (Jekyll)

Create `frontend/_config.yml` to disable Jekyll processing:
```yaml
include:
  - "**/*.html"
  - "**/*.css"
  - "**/*.js"
```

## Environment Variables

For production, update the API URL in your JavaScript:

```javascript
// Production API URL
const API_BASE = 'https://your-production-api.com';
```

## Testing Before Deploy

```bash
# Test locally
cd backend
python main.py

# In another terminal, serve frontend
cd frontend
python -m http.server 8080

# Open http://localhost:8080
```

## Security Considerations

1. **CORS**: Ensure your backend allows requests from your GitHub Pages domain
2. **Rate Limiting**: Implement rate limiting on your API
3. **HTTPS**: Use HTTPS for all API communications
4. **Input Validation**: Validate all inputs on the backend

## Troubleshooting

### 404 Errors on API Calls

- Check that `API_BASE` in `app.js` points to correct backend URL
- Verify backend is deployed and accessible
- Check CORS settings in `backend/main.py`

### PDF Upload Fails

- Ensure backend handles file uploads correctly
- Check file size limits (20MB default)
- Verify `multipart/form-data` content type

### GitHub Pages Not Updating

- Clear browser cache
- Check GitHub Pages deployment logs
- Verify files are in correct branch/folder

## Cost Summary

| Platform | Frontend | Backend | Cost |
|----------|----------|---------|------|
| GitHub Pages | ✓ | ✗ | Free |
| Render (Free) | - | ✓ | Free |
| Railway | ✓ | ✓ | Free tier |
| Vercel | ✓ | - | Free |
| Heroku | - | ✓ | $5+/mo |

## Support

For issues:
1. Check the [README.md](README.md) for setup instructions
2. Review API documentation at `/docs` endpoint
3. Open an issue on GitHub
