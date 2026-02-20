// Beyond Sedlis Nomogram - Frontend Application (Simplified, no upload)

// API Configuration
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : '';

// Application State
const state = {
    isCalculating: false
};

// DOM Elements
const elements = {
    riskForm: null,
    loadingState: null,
    resultsSection: null,
    riskValue: null,
    riskBadge: null,
    progressFill: null,
    detailsContent: null,
    calculateAgainBtn: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    cacheElements();

    // Set up event listeners
    setupEventListeners();
});

function cacheElements() {
    elements.riskForm = document.getElementById('riskForm');
    elements.loadingState = document.getElementById('loadingState');
    elements.resultsSection = document.getElementById('resultsSection');
    elements.riskValue = document.getElementById('riskValue');
    elements.riskBadge = document.getElementById('riskBadge');
    elements.progressFill = document.getElementById('progressFill');
    elements.detailsContent = document.getElementById('detailsContent');
    elements.calculateAgainBtn = document.getElementById('calculateAgainBtn');
}

function setupEventListeners() {
    // Form submission
    elements.riskForm.addEventListener('submit', handleCalculate);

    // Calculate again button
    elements.calculateAgainBtn.addEventListener('click', showCalculator);
}

// Calculator
function showCalculator() {
    elements.resultsSection.classList.add('hidden');
    elements.riskForm.classList.remove('hidden');
    elements.riskForm.reset();
}

async function handleCalculate(e) {
    e.preventDefault();

    if (state.isCalculating) return;

    // Get form values
    const formData = new FormData(elements.riskForm);
    const invasionDepthCategory = formData.get('invasionDepth');

    // Normalize invasion depth category
    const dsiMap = {
        'superficial': 'Superficial',
        'middle': 'Middle',
        'deep': 'Deep'
    };

    const data = {
        vascular_invasion: formData.get('vascularInvasion'),
        invasion_depth_category: dsiMap[invasionDepthCategory],
        tumor_size: parseFloat(formData.get('tumorSize')),
        tissue_type: formData.get('tissueType')
    };

    // Validate
    if (!data.vascular_invasion || !data.invasion_depth_category ||
        isNaN(data.tumor_size) || !data.tissue_type) {
        alert('Please fill in all required fields.');
        return;
    }

    // Show loading
    state.isCalculating = true;
    elements.riskForm.classList.add('hidden');
    elements.loadingState.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE}/api/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data)
        });

        const result = await response.json();

        if (result.success) {
            showResults(result);
        } else {
            alert(`Calculation error: ${result.error || 'Unknown error'}`);
            showCalculator();
        }

    } catch (error) {
        console.error('Calculation error:', error);
        alert('Network error. Please try again.');
        showCalculator();
    } finally {
        state.isCalculating = false;
        elements.loadingState.classList.add('hidden');
    }
}

function showResults(result) {
    elements.riskForm.classList.add('hidden');
    elements.resultsSection.classList.remove('hidden');

    // Risk percentage
    const riskPercent = result.recurrence_risk_percent;
    elements.riskValue.textContent = `${riskPercent.toFixed(1)}%`;

    // Risk badge
    const riskLevel = result.risk_level || 'Unknown';
    elements.riskBadge.textContent = riskLevel;
    elements.riskBadge.className = `risk-badge ${riskLevel.toLowerCase()}`;

    // Progress bar
    elements.progressFill.style.width = `${riskPercent}%`;

    // Details
    elements.detailsContent.innerHTML = formatExplanation(result.explanation);
}

function formatExplanation(explanation) {
    // Convert markdown-style headers to HTML
    return explanation
        .replace(/### (.*)/g, '<h4>$1</h4>')
        .replace(/## (.*)/g, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/^- (.*)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>')
        .replace(/<li>/g, '<ul><li>')
        .replace(/<\/li>/g, '</li></ul>')
        .replace(/<\/ul><ul>/g, '');
}
