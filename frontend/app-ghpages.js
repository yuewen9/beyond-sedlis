// GitHub Pages compatible version - uses relative API paths
// To use: rename this file to app.js or update API_BASE below

// API Configuration for GitHub Pages
// When deployed to GitHub Pages, API calls need to go to your hosted backend
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'  // Local development
    : 'https://your-backend-url.com';  // Replace with your deployed backend URL

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
    cacheElements();
    setupEventListeners();
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
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.fileInput.click();
    });
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.riskForm.addEventListener('submit', handleCalculate);
    elements.uploadNewBtn.addEventListener('click', () => {
        resetUpload();
        elements.fileInput.click();
    });
    elements.calculateAgainBtn.addEventListener('click', showCalculator);
}

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
    if (files.length > 0) handleFile(files[0]);
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) handleFile(files[0]);
}

async function handleFile(file) {
    if (file.type !== 'application/pdf') {
        showUploadStatus('error', 'Invalid file type. Please upload a PDF file.');
        return;
    }
    if (file.size > 20 * 1024 * 1024) {
        showUploadStatus('error', 'File too large. Maximum size is 20MB.');
        return;
    }

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
            showUploadStatus('success', 'PDF parsed successfully!');
            showModelInfo(data.metadata);
            showCalculator();
        } else {
            showUploadStatus('error', data.message || 'Failed to parse PDF.');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus('error', 'Network error. Please check API connection.');
    }
}

function showUploadStatus(type, message) {
    elements.uploadStatus.className = `upload-status show ${type}`;
    elements.uploadStatus.innerHTML = `
        <span class="status-icon">${getStatusIcon(type)}</span>
        <span class="status-message">${message}</span>
    `;
    if (type !== 'loading') {
        setTimeout(() => elements.uploadStatus.classList.remove('show'), 5000);
    }
}

function getStatusIcon(type) {
    const icons = { success: '✓', error: '✕', loading: '⟳' };
    return icons[type] || '';
}

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
            <span class="model-info-value">${metadata.calculation_type || 'Cox Model'}</span>
        </div>
    `;
}

function showCalculator() {
    elements.resultsSection.classList.add('hidden');
    elements.calculatorSection.classList.remove('hidden');
    elements.riskForm.reset();
}

async function handleCalculate(e) {
    e.preventDefault();
    if (state.isCalculating) return;

    const formData = new FormData(elements.riskForm);
    const data = {
        vascular_invasion: formData.get('vascularInvasion'),
        invasion_depth: parseFloat(formData.get('invasionDepth')),
        tumor_size: parseFloat(formData.get('tumorSize')),
        tissue_type: formData.get('tissueType'),
        model_id: state.modelId
    };

    if (!data.vascular_invasion || isNaN(data.invasion_depth) ||
        isNaN(data.tumor_size) || !data.tissue_type) {
        alert('Please fill in all required fields.');
        return;
    }

    state.isCalculating = true;
    elements.riskForm.classList.add('hidden');
    elements.loadingState.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE}/api/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
        alert('Network error. Please check API connection.');
        showCalculator();
    } finally {
        state.isCalculating = false;
        elements.loadingState.classList.add('hidden');
    }
}

function showResults(result) {
    elements.calculatorSection.classList.add('hidden');
    elements.resultsSection.classList.remove('hidden');

    const riskPercent = result.recurrence_risk_percent;
    elements.riskValue.textContent = `${riskPercent.toFixed(1)}%`;

    const riskLevel = result.risk_level || 'Unknown';
    elements.riskBadge.textContent = riskLevel;
    elements.riskBadge.className = `risk-badge ${riskLevel.toLowerCase()}`;

    elements.progressFill.style.width = `${riskPercent}%`;
    elements.detailsContent.innerHTML = formatExplanation(result.explanation);

    if (result.intermediate_values) showParameters(result.intermediate_values);
}

function showParameters(intermediateValues) {
    elements.paramsContent.innerHTML = '';
    const paramConfigs = {
        vascular_invasion: { label: 'Vascular Invasion', format: (v) => v.value },
        invasion_depth: { label: 'Invasion Depth', format: (v) => `${v.value_mm} mm` },
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
}

function formatExplanation(explanation) {
    return explanation
        .replace(/### (.*)/g, '<h4>$1</h4>')
        .replace(/## (.*)/g, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^/, '<p>').replace(/$/, '</p>');
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

async function checkDefaultModel() {
    try {
        const response = await fetch(`${API_BASE}/api/models`);
        const data = await response.json();
        if (data.models && data.models.length > 0) {
            const metaResponse = await fetch(`${API_BASE}/api/model/${data.models[0].id}`);
            const metadata = await metaResponse.json();
            state.modelId = data.models[0].id;
            state.modelMetadata = metadata;
            showModelInfo(metadata);
            showCalculator();
        } else {
            showCalculator();
        }
    } catch (error) {
        showCalculator();
    }
}
