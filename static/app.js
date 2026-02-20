// Beyond Sedlis Nomogram - Frontend Application (Standalone, no backend)

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

// Risk lookup table from Table 3 (Beyond Sedlis paper)
// Key: "Vascular Invasion|DSI Category|Size Category" → Risk Percentage
const RISK_LOOKUP_TABLE = {
    "SCC": {
        // VI=No
        "No|Superficial|<2cm": 5,
        "No|Middle|<2cm": 18,
        "No|Deep|<2cm": 32,
        "No|Superficial|2-4cm": 5,
        "No|Middle|2-4cm": 22,
        "No|Deep|2-4cm": 38,
        "No|Superficial|>=4cm": 10,
        "No|Middle|>=4cm": 28,
        "No|Deep|>=4cm": 42,
        // VI=Yes
        "Yes|Superficial|<2cm": 5,
        "Yes|Middle|<2cm": 22,
        "Yes|Deep|<2cm": 38,
        "Yes|Superficial|2-4cm": 8,
        "Yes|Middle|2-4cm": 26,
        "Yes|Deep|2-4cm": 40,
        "Yes|Superficial|>=4cm": 14,
        "Yes|Middle|>=4cm": 32,
        "Yes|Deep|>=4cm": 46,
    },
    "AC": {
        // VI=No
        "No|Superficial|<2cm": 5,
        "No|Middle|<2cm": 5,
        "No|Deep|<2cm": 6,
        "No|Superficial|2-4cm": 24,
        "No|Middle|2-4cm": 20,
        "No|Deep|2-4cm": 26,
        "No|Superficial|>=4cm": 34,
        "No|Middle|>=4cm": 30,
        "No|Deep|>=4cm": 36,
        // VI=Yes
        "Yes|Superficial|<2cm": 20,
        "Yes|Middle|<2cm": 18,
        "Yes|Deep|<2cm": 22,
        "Yes|Superficial|2-4cm": 40,
        "Yes|Middle|2-4cm": 38,
        "Yes|Deep|2-4cm": 42,
        "Yes|Superficial|>=4cm": 50,
        "Yes|Middle|>=4cm": 46,
        "Yes|Deep|>=4cm": 52,
    }
};

// Size category mapping
function getSizeCategory(sizeCm) {
    if (sizeCm < 2) return "<2cm";
    if (sizeCm < 4) return "2-4cm";
    return ">=4cm";
}

// Get risk level from percentage
function getRiskLevel(riskPercent) {
    if (riskPercent < 15) return "Low";
    if (riskPercent < 30) return "Intermediate";
    return "High";
}

// Look up risk from table
function lookupRisk(vi, dsi, sizeCm, tissueType) {
    const sizeCategory = getSizeCategory(sizeCm);
    const key = `${vi}|${dsi}|${sizeCategory}`;

    if (tissueType in RISK_LOOKUP_TABLE) {
        const table = RISK_LOOKUP_TABLE[tissueType];
        if (key in table) {
            return table[key];
        }
    }
    return null;
}

// Build explanation text
function buildExplanation(vi, dsi, sizeCm, tissueType, riskPercent) {
    const sizeCategory = getSizeCategory(sizeCm);

    let explanation = `### Risk Calculation Details\n\n`;
    explanation += `**Parameters:**\n`;
    explanation += `- Vascular Invasion: ${vi}\n`;
    explanation += `- Stromal Invasion Depth: ${dsi}\n`;
    explanation += `- Tumor Size: ${sizeCm} cm (${sizeCategory})\n`;
    explanation += `- Histologic Type: ${tissueType}\n\n`;

    explanation += `### Result\n\n`;
    explanation += `Based on the Beyond Sedlis nomogram (Table 3), `;
    explanation += `the estimated **3-year recurrence risk** is **${riskPercent}%**.\n\n`;

    const riskLevel = getRiskLevel(riskPercent);
    explanation += `**Risk Level:** ${riskLevel}\n\n`;

    explanation += `### Reference\n\n`;
    explanation += `Risk values derived from the Beyond Sedlis nomogram `;
    explanation += `for early-stage cervical cancer.`;

    return explanation;
}

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

function handleCalculate(e) {
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

    const vi = formData.get('vascularInvasion');
    const dsi = dsiMap[invasionDepthCategory];
    const sizeCm = parseFloat(formData.get('tumorSize'));
    const tissueType = formData.get('tissueType');

    // Validate
    if (!vi || !dsi || isNaN(sizeCm) || !tissueType) {
        alert('Please fill in all required fields.');
        return;
    }

    // Show loading
    state.isCalculating = true;
    elements.riskForm.classList.add('hidden');
    elements.loadingState.classList.remove('hidden');

    // Simulate calculation delay for UX
    setTimeout(() => {
        try {
            // Look up risk from table
            const riskPercent = lookupRisk(vi, dsi, sizeCm, tissueType);

            if (riskPercent !== null) {
                const riskLevel = getRiskLevel(riskPercent);
                const explanation = buildExplanation(vi, dsi, sizeCm, tissueType, riskPercent);

                showResults({
                    recurrence_risk_percent: riskPercent,
                    risk_level: riskLevel,
                    explanation: explanation
                });
            } else {
                alert('Unable to calculate risk for the given parameters.');
                showCalculator();
            }
        } catch (error) {
            console.error('Calculation error:', error);
            alert('Calculation error. Please try again.');
            showCalculator();
        } finally {
            state.isCalculating = false;
            elements.loadingState.classList.add('hidden');
        }
    }, 500);
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
