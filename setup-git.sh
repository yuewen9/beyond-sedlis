#!/bin/bash
# Git setup and GitHub upload script for Beyond Sedlis Nomogram Calculator

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "GitHub Repository Setup"
echo "========================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing Git repository...${NC}"
    git init
fi

# Check if remote exists
if ! git remote get-url origin &> /dev/null; then
    echo ""
    echo "Please enter your GitHub repository URL:"
    echo "Format: https://github.com/username/repo-name.git"
    read -r REPO_URL

    if [ -n "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        echo -e "${GREEN}Remote 'origin' added${NC}"
    else
        echo "No repository URL provided. You can add it later with:"
        echo "  git remote add origin <your-repo-url>"
    fi
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
venv/
env/
ENV/
.venv

# FastAPI / uploads
uploads/
temp/
*.pdf

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
EOF
    echo -e "${GREEN}Created .gitignore${NC}"
fi

# Create logs directory .gitkeep
mkdir -p backend/logs backend/uploads backend/temp
touch backend/logs/.gitkeep backend/uploads/.gitkeep backend/temp/.gitkeep

# Add all files
echo ""
echo "Adding files to Git..."
git add .

# Check status
echo ""
echo "Files to be committed:"
git status --short

# Commit
echo ""
echo "Creating initial commit..."
git commit -m "Initial commit: Beyond Sedlis Nomogram Calculator

- FastAPI backend with PDF Table 3 parser
- Vanilla HTML/CSS/JS frontend
- Risk calculator based on Cox model
- GitHub Pages deployment ready

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Push to GitHub
if git remote get-url origin &> /dev/null; then
    echo ""
    echo -e "${GREEN}Ready to push to GitHub!${NC}"
    echo ""
    echo "To push to the main branch, run:"
    echo "  git push -u origin main"
    echo ""
    echo "Or if the default branch is 'master':"
    echo "  git branch -M main"
    echo "  git push -u origin main"
    echo ""
    echo "After pushing, enable GitHub Pages in repository settings:"
    echo "  Settings → Pages → Source: Deploy from a branch"
    echo "  Branch: main / Root"
else
    echo ""
    echo -e "${YELLOW}No remote repository configured.${NC}"
    echo ""
    echo "To add a remote repository:"
    echo "  1. Create a new repository on GitHub"
    echo "  2. Run: git remote add origin <your-repo-url>"
    echo "  3. Run: git push -u origin main"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
