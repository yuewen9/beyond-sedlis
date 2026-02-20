// Beyond Sedlis Nomogram - Frontend Application

// API Configuration
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : '';

// Application State
const state = {
    modelId: null,
    modelMetadata: null,
    isUploading: false,
    isCalculating: false
};

// DOM Elements
const elements = {
    uploadArea: null,
    fileInput: null,
    browseBtn: null,
    uploadStatus: null,
    uploadSection: null,
    modelSection: null,
    modelInfo: null,
    uploadNewBtn: null,
    calculatorSection: null,
    riskForm: null,
    loadingState: null,
    resultsSection: null,
    riskValue: null,
    riskBadge: null,
    progressFill: null,
    detailsContent: null,
    paramsContent: null,
    calculateAgainBtn: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    cacheElements();

    // Set up event listeners
    setupEventListeners();

    // Check for default model
    checkDefaultModel();
});

function cacheElements() {
    elements.uploadArea = document.getElementById('uploadArea');
    elements.fileInput = document.getElementById('fileInput');
    elements.browseBtn = document.getElementById('browseBtn');
    elements.uploadStatus = document.getElementById('uploadStatus');
    elements.uploadSection = document.getElementById('uploadSection');
    elements.modelSection = document.getElementById('modelSection');
    elements.modelInfo = document.getElementById('modelInfo');
    elements.uploadNewBtn = document.getElementById('uploadNewBtn');
    elements.calculatorSection = document.getElementById('calculatorSection');
    elements.riskForm = document.getElementById('riskForm');
    elements.loadingState = document.getElementById('loadingState');
    elements.resultsSection = document.getElementById('resultsSection');
    elements.riskValue = document.getElementById('riskValue');
    elements.riskBadge = document.getElementById('riskBadge');
    elements.progressFill = document.getElementById('progressFill');
    elements.detailsContent = document.getElementById('detailsContent');
    elements.paramsContent = document.getElementById('paramsContent');
    elements.calculateAgainBtn = document.getElementById('calculateAgainBtn');
}

function setupEventListeners() {
    // Upload area click
    elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.click();
    });

    // File input change
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Browse button click
    elements.browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.fileInput.click();
    });

    // Drag and drop
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);

    // Form submission
    elements.riskForm.addEventListener('submit', handleCalculate);

    // Upload new button
    elements.uploadNewBtn.addEventListener('click', () => {
        resetUpload();
        elements.fileInput.click();
    });

    // Calculate again button
    elements.calculateAgainBtn.addEventListener('click', showCalculator);
}

// File Handling
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

async function handleFile(file) {
    // Validate file type
    if (file.type !== 'application/pdf') {
        showUploadStatus('error', 'Invalid file type. Please upload a PDF file.');
        return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
        showUploadStatus('error', 'File too large. Maximum size is 20MB.');
        return;
    }

    // Upload file
    showUploadStatus('loading', 'Parsing PDF and extracting Table 3...');

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            state.modelId = data.model_id;
            state.modelMetadata = data.metadata;

            showUploadStatus('success', 'PDF parsed successfully! Table 3 parameters extracted.');
            showModelInfo(data.metadata);
            showCalculator();

            if (data.warnings && data.warnings.length > 0) {
                console.warn('Parsing warnings:', data.warnings);
            }
        } else {
            showUploadStatus('error', data.message || 'Failed to parse PDF.');
        }

    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus('error', 'Network error. Please try again.');
    }
}

function showUploadStatus(type, message) {
    elements.uploadStatus.className = `upload-status show ${type}`;
    elements.uploadStatus.innerHTML = `
        <span class="status-icon">${getStatusIcon(type)}</span>
        <span class="status-message">${message}</span>
    `;

    if (type !== 'loading') {
        setTimeout(() => {
            elements.uploadStatus.classList.remove('show');
        }, 5000);
    }
}

function getStatusIcon(type) {
    const icons = {
        success: '✓',
        error: '✕',
        loading: '⟳'
    };
    return icons[type] || '';
}

// Model Info Display
function showModelInfo(metadata) {
    elements.uploadSection.classList.add('hidden');
    elements.modelSection.classList.remove('hidden');

    elements.modelInfo.innerHTML = `
        <div class="model-info-item">
            <span class="model-info-label">Source</span>
            <span class="model-info-value">${metadata.source_file || 'Default Model'}</span>
        </div>
        <div class="model-info-item">
            <span class="model-info-label">Variables</span>
            <span class="model-info-value">${metadata.variables.length} risk factors</span>
        </div>
        <div class="model-info-item">
            <span class="model-info-label">Model Type</span>
            <span class="model-info-value">${metadata.calculation_type || 'Cox Proportional Hazards'}</span>
        </div>
    `;

    // Show parameters summary
    if (metadata.coefficients) {
        const paramsDiv = document.createElement('div');
        paramsDiv.className = 'model-info-item';
        paramsDiv.innerHTML = `
            <span class="model-info-label">Coefficients</span>
            <span class="model-info-value">${Object.keys(metadata.coefficients).length} parameters</span>
        `;
        elements.modelInfo.appendChild(paramsDiv);
    }
}

// Calculator
function showCalculator() {
    elements.resultsSection.classList.add('hidden');
    elements.calculatorSection.classList.remove('hidden');
    elements.riskForm.reset();
}

async function handleCalculate(e) {
    e.preventDefault();

    if (state.isCalculating) return;

    // Get form values
    const formData = new FormData(elements.riskForm);
    const invasionDepthCategory = formData.get('invasionDepth');

    // Convert invasion depth category to numeric value (mm)
    const invasionDepthMap = {
        'superficial': 3,   // < 5mm
        'middle': 7,        // 5-9mm
        'deep': 12          // >= 10mm
    };

    const data = {
        vascular_invasion: formData.get('vascularInvasion'),
        invasion_depth: invasionDepthMap[invasionDepthCategory],
        tumor_size: parseFloat(formData.get('tumorSize')),
        tissue_type: formData.get('tissueType'),
        model_id: state.modelId
    };

    // Validate
    if (!data.vascular_invasion || !data.invasion_depth ||
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
    elements.calculatorSection.classList.add('hidden');
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

    // Parameters
    if (result.intermediate_values) {
        showParameters(result.intermediate_values);
    }
}

function showParameters(intermediateValues) {
    elements.paramsContent.innerHTML = '';

    // Map mm values to categories for display
    const getDepthCategory = (mm) => {
        if (mm < 5) return 'Superficial (<5mm)';
        if (mm < 10) return 'Middle (5-9mm)';
        return 'Deep (≥10mm)';
    };

    const paramConfigs = {
        vascular_invasion: { label: 'Vascular Invasion', format: (v) => v.value },
        invasion_depth: { label: 'Invasion Depth', format: (v) => getDepthCategory(v.value_mm) },
        tumor_size: { label: 'Tumor Size', format: (v) => `${v.value_cm} cm` },
        tissue_type: { label: 'Tissue Type', format: (v) => v.value }
    };

    for (const [key, config] of Object.entries(paramConfigs)) {
        if (intermediateValues[key]) {
            const item = document.createElement('div');
            item.className = 'param-item';
            item.innerHTML = `
                <div class="param-name">${config.label}</div>
                <div class="param-value">${config.format(intermediateValues[key])}</div>
            `;
            elements.paramsContent.appendChild(item);
        }
    }

    // Add linear predictor
    if (intermediateValues.linear_predictor !== undefined) {
        const item = document.createElement('div');
        item.className = 'param-item';
        item.innerHTML = `
            <div class="param-name">Linear Predictor</div>
            <div class="param-value">${intermediateValues.linear_predictor.toFixed(4)}</div>
        `;
        elements.paramsContent.appendChild(item);
    }
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

function resetUpload() {
    state.modelId = null;
    state.modelMetadata = null;
    elements.uploadStatus.classList.remove('show');
    elements.uploadSection.classList.remove('hidden');
    elements.modelSection.classList.add('hidden');
    elements.calculatorSection.classList.add('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.fileInput.value = '';
}

// Check for default model on page load
async function checkDefaultModel() {
    try {
        const response = await fetch(`${API_BASE}/api/models`);
        const data = await response.json();

        if (data.models && data.models.length > 0) {
            // Use the first available model
            const model = data.models[0];
            state.modelId = model.id;

            // Get full metadata
            const metaResponse = await fetch(`${API_BASE}/api/model/${model.id}`);
            const metadata = await metaResponse.json();

            state.modelMetadata = metadata;
            showModelInfo(metadata);
            showCalculator();
        } else {
            // Show calculator with default (server-side) model
            showCalculator();
        }
    } catch (error) {
        console.log('No default model found, showing upload');
    }
}

// Utility: Format date
function formatDate(isoString) {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    return date.toLocaleDateString();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { state, elements };
}
