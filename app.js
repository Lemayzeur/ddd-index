// ============================================================================
// POVERTY DASHBOARD - Clean Version 2.0
// ============================================================================

// Global state
const appData = {
    counties: null,
    geoJson: null,
    metadata: null,
    modelStats: null,
    povertyData: null,
    clusters: null
};

let dataLoaded = false;
let map = null;
let geoJsonLayer = null;
let charts = {
    trend: null,
    state: null,
    cluster: null,
    model: null,
    corr: null
};

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadAllData() {
    try {
        console.log('📥 Loading data files...');
        
        const [countiesGeo, metadata, modelStats, povertyData, clusters] = await Promise.all([
            fetch('./data/counties.geojson').then(r => r.json()),
            fetch('./data/metadata.json').then(r => r.json()),
            fetch('./data/model-stats.json').then(r => r.json()),
            fetch('./data/poverty-data.json').then(r => r.json()),
            fetch('./data/clusters.json').then(r => r.json())
        ]);
        
        appData.geoJson = countiesGeo;
        appData.metadata = metadata;
        appData.modelStats = modelStats;
        appData.povertyData = povertyData;
        appData.clusters = clusters;
        
        appData.counties = countiesGeo.features.map(f => ({
            geoid: f.properties.GEOID,
            name: f.properties.name,
            state: f.properties.state,
            poverty: f.properties.poverty_rate,
            actualPoverty: f.properties.actual_poverty,
            assistance: f.properties.assistance_rate,
            misalignment: f.properties.misalignment,
            cluster: f.properties.cluster,
            clusterLabel: f.properties.cluster_label,
            clusterCode: f.properties.cluster_code
        }));
        
        dataLoaded = true;
        console.log(`✅ Loaded ${appData.counties.length} counties`);
        
        updateOverviewStats();
        return true;
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Failed to load data. Check console for details.');
        return false;
    }
}

function updateOverviewStats() {
    const stats = appData.metadata.statistics;
    const statCards = document.querySelectorAll('.stat-card .stat-value');
    
    if (statCards.length >= 3) {
        statCards[0].textContent = `${(stats.avg_poverty_rate * 100).toFixed(1)}%`;
        statCards[1].textContent = stats.model_accuracy.toFixed(2);
        statCards[2].textContent = `${stats.under_served_pct.toFixed(0)}%`;
    }
}

// ============================================================================
// NAVIGATION
// ============================================================================

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }
    
    // Initialize section content
    setTimeout(() => {
        if (sectionId === 'maps' && !map) initializeMap();
        else if (sectionId === 'trends' && !charts.trend) initializeTrendCharts();
        else if (sectionId === 'clusters' && !charts.cluster) initializeClusterChart();
        else if (sectionId === 'analysis' && !charts.model) initializeAnalysisCharts();
        else if (sectionId === 'data') initializeDataTable();
    }, 100);
}

// ============================================================================
// MAP FUNCTIONS
// ============================================================================

function initializeMap() {
    if (map || !dataLoaded) return;
    
    map = L.map('map').setView([32.5, -86.5], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        maxZoom: 20
    }).addTo(map);
    
    updateMap();
}

function updateMap() {
    if (!map || !dataLoaded) return;
    
    if (geoJsonLayer) map.removeLayer(geoJsonLayer);
    
    const metric = document.getElementById('metricSelect').value;
    
    geoJsonLayer = L.geoJSON(appData.geoJson, {
        style: f => ({
            fillColor: getFeatureColor(f, metric),
            weight: 1,
            opacity: 1,
            color: '#fff',
            fillOpacity: 0.7
        }),
        onEachFeature: (feature, layer) => {
            const p = feature.properties;
            layer.bindPopup(`
                <strong>${p.name}, ${p.state}</strong><br>
                Poverty: ${(p.poverty_rate * 100).toFixed(1)}%<br>
                Assistance: ${(p.assistance_rate * 100).toFixed(1)}%<br>
                Misalignment: ${p.misalignment.toFixed(2)}
            `);
        }
    }).addTo(map);
}

function getFeatureColor(feature, metric) {
    const p = feature.properties;
    
    if (metric === 'poverty') {
        const r = p.poverty_rate;
        return r > 0.25 ? '#67000d' : r > 0.20 ? '#a50f15' : r > 0.15 ? '#ef3b2c' : r > 0.10 ? '#fc9272' : '#fee5d9';
    } else if (metric === 'assistance') {
        const r = p.assistance_rate;
        return r > 0.25 ? '#08306b' : r > 0.20 ? '#08519c' : r > 0.15 ? '#2171b5' : r > 0.10 ? '#6baed6' : '#c6dbef';
    } else if (metric === 'misalignment') {
        const s = p.misalignment;
        return s > 0.5 ? '#d73027' : s > 0.25 ? '#fc8d59' : s > -0.25 ? '#ffffbf' : s > -0.5 ? '#91bfdb' : '#4575b4';
    } else {
        const colors = { 'low-low': '#2ecc71', 'low-high': '#3498db', 'high-under': '#e74c3c', 'high-high': '#f39c12' };
        return colors[p.cluster_code] || '#95a5a6';
    }
}

// ============================================================================
// CHARTS
// ============================================================================

function initializeTrendCharts() {
    if (charts.trend || !dataLoaded) return;
    
    const data = appData.povertyData;
    
    charts.trend = new Chart(document.getElementById('trendChart'), {
        type: 'line',
        data: {
            labels: data.years,
            datasets: [{
                label: 'Poverty Rate',
                data: data.overall.map(v => v * 100),
                borderColor: '#e94560',
                backgroundColor: 'rgba(233, 69, 96, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { callback: v => v + '%' } },
                x: { grid: { display: false } }
            }
        }
    });
    
    const stateLabels = Object.keys(data.states);
    const stateValues = stateLabels.map(state => {
        const arr = data.states[state];
        return (arr[arr.length - 1] * 100).toFixed(1);
    });
    
    charts.state = new Chart(document.getElementById('stateChart'), {
        type: 'bar',
        data: {
            labels: stateLabels,
            datasets: [{
                label: '2023 Poverty',
                data: stateValues,
                backgroundColor: '#0f3460',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { callback: v => v + '%' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function initializeClusterChart() {
    if (charts.cluster || !dataLoaded) return;
    
    const clusters = appData.clusters.clusters;
    const colors = {
        'low-low': { border: '#2ecc71', bg: 'rgba(46, 204, 113, 0.2)' },
        'low-high': { border: '#3498db', bg: 'rgba(52, 152, 219, 0.2)' },
        'high-under': { border: '#e74c3c', bg: 'rgba(231, 76, 60, 0.2)' },
        'high-high': { border: '#f39c12', bg: 'rgba(243, 156, 18, 0.2)' }
    };
    
    const datasets = clusters.map(c => ({
        label: c.name,
        data: [
            (c.avg_poverty * 100).toFixed(1),
            (c.avg_assistance * 100).toFixed(1),
            c.avg_misalignment.toFixed(1)
        ],
        borderColor: colors[c.id].border,
        backgroundColor: colors[c.id].bg,
        borderWidth: 2
    }));
    
    charts.cluster = new Chart(document.getElementById('clusterChart'), {
        type: 'radar',
        data: {
            labels: ['Poverty %', 'Assistance %', 'Misalignment'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                r: { beginAtZero: true }
            }
        }
    });
}

function initializeAnalysisCharts() {
    if (charts.model || !dataLoaded) return;
    
    const stats = appData.modelStats;
    
    charts.model = new Chart(document.getElementById('modelChart'), {
        type: 'bar',
        data: {
            labels: ['Linear Regression', 'Random Forest'],
            datasets: [
                {
                    label: 'R²',
                    data: [stats.linear_regression.r2, stats.random_forest.r2],
                    backgroundColor: '#e94560',
                    borderRadius: 4
                },
                {
                    label: 'MAE (×100)',
                    data: [stats.linear_regression.mae * 100, stats.random_forest.mae * 100],
                    backgroundColor: '#0f3460',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
    
    const importance = stats.feature_importance;
    const features = Object.entries(importance).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    charts.corr = new Chart(document.getElementById('corrChart'), {
        type: 'bar',
        data: {
            labels: features.map(f => f[0].split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')),
            datasets: [{
                label: 'Importance',
                data: features.map(f => f[1]),
                backgroundColor: '#0f3460',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { max: 1, ticks: { callback: v => (v * 100).toFixed(0) + '%' } }
            }
        }
    });
}

// ============================================================================
// DATA TABLE
// ============================================================================

function initializeDataTable() {
    if (!dataLoaded) return;
    
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    appData.counties.forEach(c => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${c.name}</td>
            <td>${c.state}</td>
            <td>${(c.poverty * 100).toFixed(1)}%</td>
            <td>${(c.assistance * 100).toFixed(1)}%</td>
            <td style="color: ${c.misalignment > 0 ? '#e74c3c' : '#2ecc71'}">
                ${c.misalignment > 0 ? '+' : ''}${c.misalignment.toFixed(2)}
            </td>
            <td><span class="cluster-badge cluster-${c.clusterCode}">${c.clusterLabel}</span></td>
        `;
    });
}

function filterTable() {
    if (!dataLoaded) return;
    
    const stateFilter = document.getElementById('stateFilter').value;
    const clusterFilter = document.getElementById('clusterFilter').value;
    
    const filtered = appData.counties.filter(c => {
        const stateMatch = stateFilter === 'all' || c.state === stateFilter;
        const clusterMatch = clusterFilter === 'all' || c.clusterCode === clusterFilter;
        return stateMatch && clusterMatch;
    });
    
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    filtered.forEach(c => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${c.name}</td>
            <td>${c.state}</td>
            <td>${(c.poverty * 100).toFixed(1)}%</td>
            <td>${(c.assistance * 100).toFixed(1)}%</td>
            <td style="color: ${c.misalignment > 0 ? '#e74c3c' : '#2ecc71'}">
                ${c.misalignment > 0 ? '+' : ''}${c.misalignment.toFixed(2)}
            </td>
            <td><span class="cluster-badge cluster-${c.clusterCode}">${c.clusterLabel}</span></td>
        `;
    });
}

function sortTable(columnIndex) {
    const tbody = document.getElementById('tableBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        const aVal = a.cells[columnIndex].textContent;
        const bVal = b.cells[columnIndex].textContent;
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return aVal.localeCompare(bVal);
    });
    
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📱 DOM loaded, starting initialization...');
    
    Chart.defaults.font.family = "'Public Sans', sans-serif";
    Chart.defaults.color = '#2c3e50';
    
    const loaded = await loadAllData();
    
    if (loaded) {
        console.log('✅ Dashboard ready!');
    } else {
        console.error('Failed to initialize');
    }
});

window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
});

// Export functions
window.showSection = showSection;
window.updateMap = updateMap;
window.filterTable = filterTable;
window.sortTable = sortTable;