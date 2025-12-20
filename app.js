// ============================================================================
// POVERTY DASHBOARD - INTERACTIVE WEB APPLICATION
// ============================================================================

// Global data storage
let appData = {
    counties: null,
    geoJson: null,
    metadata: null,
    modelStats: null,
    povertyData: null,
    clusters: null
};

// Loading state
let dataLoaded = false;

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadAllData() {
    try {
        console.log('Loading data files...');
        
        // Load all data files in parallel
        const [countiesGeo, metadata, modelStats, povertyData, clusters] = await Promise.all([
            fetch('data/counties.geojson').then(r => r.json()),
            fetch('data/metadata.json').then(r => r.json()),
            fetch('data/model-stats.json').then(r => r.json()),
            fetch('data/poverty-data.json').then(r => r.json()),
            fetch('data/clusters.json').then(r => r.json())
        ]);
        
        // Store in global state
        appData.geoJson = countiesGeo;
        appData.metadata = metadata;
        appData.modelStats = modelStats;
        appData.povertyData = povertyData;
        appData.clusters = clusters;
        
        // Extract county data from GeoJSON for table
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
        console.log('All data loaded successfully');
        console.log(`Loaded ${appData.counties.length} counties`);
        
        // Update overview statistics
        updateOverviewStats();
        
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data files. Please ensure all data files are in the /data directory.');
        return false;
    }
}

function updateOverviewStats() {
    const stats = appData.metadata.statistics;
    
    // Update stat cards in overview
    document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = 
        `${(stats.avg_poverty_rate * 100).toFixed(1)}%`;
    
    document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = 
        `${(stats.poverty_decline * 100).toFixed(1)}%`;
    
    document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = 
        `${stats.under_served_pct.toFixed(1)}%`;
    
    document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = 
        `${(stats.model_accuracy * 100).toFixed(1)}%`;
}

// ============================================================================
// NAVIGATION
// ============================================================================

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Add active class to clicked nav item
    event.target.classList.add('active');
    
    // Initialize section-specific content
    if (sectionId === 'maps') {
        initializeMap();
    } else if (sectionId === 'trends') {
        initializeTrendCharts();
    } else if (sectionId === 'clusters') {
        initializeClusterChart();
    } else if (sectionId === 'analysis') {
        initializeAnalysisCharts();
    } else if (sectionId === 'data') {
        initializeDataTable();
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// MAP FUNCTIONALITY
// ============================================================================

let map;
let geoJsonLayer;

function initializeMap() {
    if (map) return; // Already initialized
    
    // Initialize Leaflet map centered on 9 southern states
    map = L.map('map').setView([32.5, -86.5], 6);
    
    // Add base tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
    
    // Load initial data
    updateMap();
}

function updateMap() {
    if (!map || !dataLoaded) return;
    
    const metric = document.getElementById('metricSelect').value;
    
    // Remove existing layer
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
    }
    
    // Add GeoJSON layer with styling
    geoJsonLayer = L.geoJSON(appData.geoJson, {
        style: function(feature) {
            return {
                fillColor: getFeatureColor(feature, metric),
                weight: 1,
                opacity: 1,
                color: '#ffffff',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            const props = feature.properties;
            const popupContent = `
                <div style="font-family: 'Public Sans', sans-serif;">
                    <h4 style="margin: 0 0 8px 0; color: #1a1a2e;">${props.name} County, ${props.state}</h4>
                    <table style="font-size: 13px;">
                        <tr><td><strong>Poverty Rate:</strong></td><td>${(props.poverty_rate * 100).toFixed(1)}%</td></tr>
                        <tr><td><strong>Actual Poverty:</strong></td><td>${(props.actual_poverty * 100).toFixed(1)}%</td></tr>
                        <tr><td><strong>Assistance Rate:</strong></td><td>${(props.assistance_rate * 100).toFixed(1)}%</td></tr>
                        <tr><td><strong>Misalignment:</strong></td><td style="color: ${props.misalignment > 0 ? '#e74c3c' : '#2ecc71'}">${props.misalignment > 0 ? '+' : ''}${props.misalignment.toFixed(2)}</td></tr>
                        <tr><td><strong>Cluster:</strong></td><td>${props.cluster_label}</td></tr>
                    </table>
                </div>
            `;
            layer.bindPopup(popupContent);
            
            // Hover effect
            layer.on({
                mouseover: function(e) {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 3,
                        color: '#1a1a2e',
                        fillOpacity: 0.9
                    });
                },
                mouseout: function(e) {
                    geoJsonLayer.resetStyle(e.target);
                }
            });
        }
    }).addTo(map);
    
    // Add legend
    addMapLegend(metric);
}

function getFeatureColor(feature, metric) {
    const props = feature.properties;
    
    if (metric === 'poverty') {
        return getPovertyColor(props.poverty_rate);
    } else if (metric === 'assistance') {
        return getAssistanceColor(props.assistance_rate);
    } else if (metric === 'misalignment') {
        return getMisalignmentColor(props.misalignment);
    } else if (metric === 'clusters') {
        return getClusterColorByCode(props.cluster_code);
    }
    return '#cccccc';
}

function getPovertyColor(rate) {
    return rate > 0.25 ? '#67000d' :
           rate > 0.20 ? '#a50f15' :
           rate > 0.15 ? '#ef3b2c' :
           rate > 0.10 ? '#fc9272' :
                         '#fee5d9';
}

function getAssistanceColor(rate) {
    return rate > 0.25 ? '#08306b' :
           rate > 0.20 ? '#08519c' :
           rate > 0.15 ? '#2171b5' :
           rate > 0.10 ? '#6baed6' :
                         '#c6dbef';
}

function getMisalignmentColor(score) {
    if (score > 0.5) return '#d73027';
    if (score > 0.25) return '#fc8d59';
    if (score > -0.25) return '#ffffbf';
    if (score > -0.5) return '#91bfdb';
    return '#4575b4';
}

function getClusterColorByCode(code) {
    const colors = {
        'low-low': '#2ecc71',
        'low-high': '#3498db',
        'high-under': '#e74c3c',
        'high-high': '#f39c12'
    };
    return colors[code] || '#95a5a6';
}

function addMapLegend(metric) {
    // Remove existing legend
    const existingLegend = document.querySelector('.map-legend');
    if (existingLegend) existingLegend.remove();
    
    const legend = L.control({position: 'bottomright'});
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'map-legend');
        div.style.cssText = 'background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);';
        
        if (metric === 'poverty') {
            div.innerHTML = `
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">Poverty Rate</h4>
                <div><span style="background: #67000d; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> > 25%</div>
                <div><span style="background: #a50f15; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> 20-25%</div>
                <div><span style="background: #ef3b2c; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> 15-20%</div>
                <div><span style="background: #fc9272; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> 10-15%</div>
                <div><span style="background: #fee5d9; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> < 10%</div>
            `;
        } else if (metric === 'assistance') {
            div.innerHTML = `
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">Assistance Rate</h4>
                <div><span style="background: #08306b; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> > 25%</div>
                <div><span style="background: #08519c; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> 20-25%</div>
                <div><span style="background: #2171b5; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> 15-20%</div>
                <div><span style="background: #6baed6; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> 10-15%</div>
                <div><span style="background: #c6dbef; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> < 10%</div>
            `;
        } else if (metric === 'misalignment') {
            div.innerHTML = `
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">Misalignment Score</h4>
                <div><span style="background: #d73027; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> High Under-Served</div>
                <div><span style="background: #fc8d59; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> Under-Served</div>
                <div><span style="background: #ffffbf; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> Aligned</div>
                <div><span style="background: #91bfdb; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> Over-Served</div>
                <div><span style="background: #4575b4; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> High Over-Served</div>
            `;
        } else if (metric === 'clusters') {
            div.innerHTML = `
                <h4 style="margin: 0 0 8px 0; font-size: 14px;">Policy Clusters</h4>
                <div><span style="background: #2ecc71; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> Low Need / Low Assist</div>
                <div><span style="background: #3498db; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> Low-Mod / High Assist</div>
                <div><span style="background: #e74c3c; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> High Need / Under-Served</div>
                <div><span style="background: #f39c12; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span> High Need / High Assist</div>
            `;
        }
        
        div.style.fontSize = '12px';
        div.style.lineHeight = '18px';
        return div;
    };
    
    legend.addTo(map);
}

// ============================================================================
// CHART FUNCTIONALITY
// ============================================================================

let trendChart, stateChart, clusterChart, modelChart, corrChart;

function initializeTrendCharts() {
    if (trendChart || !dataLoaded) return;
    
    const data = appData.povertyData;
    
    // Overall poverty trend
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: data.years,
            datasets: [{
                label: 'Average Poverty Rate',
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
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 46, 0.95)',
                    titleFont: { family: 'IBM Plex Mono', size: 12 },
                    bodyFont: { family: 'Public Sans', size: 14 },
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Poverty Rate: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: value => value + '%',
                        font: { family: 'IBM Plex Mono', size: 11 }
                    },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                x: {
                    ticks: { font: { family: 'IBM Plex Mono', size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
    
    // State comparison (2023 data - last year)
    const stateCtx = document.getElementById('stateChart').getContext('2d');
    const stateMapping = {
        'AL': '01', 'AR': '05', 'FL': '12', 'GA': '13',
        'KY': '21', 'LA': '22', 'MS': '28', 'MO': '29', 'WV': '54'
    };
    
    const stateLabels = Object.keys(data.states);
    const stateValues = stateLabels.map(state => {
        const stateData = data.states[state];
        return (stateData[stateData.length - 1] * 100).toFixed(1);
    });
    
    stateChart = new Chart(stateCtx, {
        type: 'bar',
        data: {
            labels: stateLabels,
            datasets: [{
                label: '2023 Poverty Rate',
                data: stateValues,
                backgroundColor: '#0f3460',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 46, 0.95)',
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: context => `Poverty Rate: ${context.parsed.y}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => value + '%',
                        font: { family: 'IBM Plex Mono', size: 11 }
                    },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                x: {
                    ticks: { font: { family: 'IBM Plex Mono', size: 12 } },
                    grid: { display: false }
                }
            }
        }
    });
}

function initializeClusterChart() {
    if (clusterChart || !dataLoaded) return;
    
    const clusters = appData.clusters.clusters;
    
    const clusterCtx = document.getElementById('clusterChart').getContext('2d');
    
    const datasets = clusters.map(cluster => {
        const colors = {
            'low-low': { border: '#2ecc71', bg: 'rgba(46, 204, 113, 0.2)' },
            'low-high': { border: '#3498db', bg: 'rgba(52, 152, 219, 0.2)' },
            'high-under': { border: '#e74c3c', bg: 'rgba(231, 76, 60, 0.2)' },
            'high-high': { border: '#f39c12', bg: 'rgba(243, 156, 18, 0.2)' }
        };
        
        const color = colors[cluster.id] || { border: '#95a5a6', bg: 'rgba(149, 165, 166, 0.2)' };
        
        return {
            label: cluster.name,
            data: [
                (cluster.avg_poverty * 100).toFixed(1),
                (cluster.avg_assistance * 100).toFixed(1),
                cluster.avg_misalignment.toFixed(1)
            ],
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 2
        };
    });
    
    clusterChart = new Chart(clusterCtx, {
        type: 'radar',
        data: {
            labels: ['Expected Poverty (%)', 'Assistance Rate (%)', 'Misalignment Score'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'IBM Plex Mono', size: 11 },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: { font: { family: 'IBM Plex Mono', size: 10 } },
                    pointLabels: { font: { family: 'Public Sans', size: 12, weight: '600' } }
                }
            }
        }
    });
}

function initializeAnalysisCharts() {
    if (modelChart || !dataLoaded) return;
    
    const modelStats = appData.modelStats;
    
    // Model comparison
    const modelCtx = document.getElementById('modelChart').getContext('2d');
    modelChart = new Chart(modelCtx, {
        type: 'bar',
        data: {
            labels: ['Linear Regression', 'Random Forest'],
            datasets: [
                {
                    label: 'R² Score',
                    data: [modelStats.linear_regression.r2, modelStats.random_forest.r2],
                    backgroundColor: '#e94560',
                    borderRadius: 4
                },
                {
                    label: 'MAE (×100)',
                    data: [
                        modelStats.linear_regression.mae * 100,
                        modelStats.random_forest.mae * 100
                    ],
                    backgroundColor: '#0f3460',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'IBM Plex Mono', size: 11 },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { font: { family: 'IBM Plex Mono', size: 11 } }
                },
                x: {
                    ticks: { font: { family: 'Public Sans', size: 12 } },
                    grid: { display: false }
                }
            }
        }
    });
    
    // Feature importance
    const corrCtx = document.getElementById('corrChart').getContext('2d');
    const importance = modelStats.feature_importance;
    
    // Get top 10 features
    const features = Object.entries(importance)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const featureLabels = features.map(f => {
        return f[0].split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    });
    const featureValues = features.map(f => f[1]);
    
    corrChart = new Chart(corrCtx, {
        type: 'bar',
        data: {
            labels: featureLabels,
            datasets: [{
                label: 'Feature Importance',
                data: featureValues,
                backgroundColor: '#0f3460',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 1,
                    ticks: {
                        callback: value => (value * 100).toFixed(0) + '%',
                        font: { family: 'IBM Plex Mono', size: 11 }
                    }
                },
                y: {
                    ticks: { font: { family: 'Public Sans', size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================================================
// DATA TABLE FUNCTIONALITY
// ============================================================================

function initializeDataTable() {
    if (!dataLoaded) return;
    
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    appData.counties.forEach(county => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${county.name}</td>
            <td>${county.state}</td>
            <td>${(county.poverty * 100).toFixed(1)}%</td>
            <td>${(county.assistance * 100).toFixed(1)}%</td>
            <td style="color: ${county.misalignment > 0 ? '#e74c3c' : '#2ecc71'}">
                ${county.misalignment > 0 ? '+' : ''}${county.misalignment.toFixed(2)}
            </td>
            <td>
                <span class="cluster-badge cluster-${county.clusterCode}">
                    ${county.clusterLabel}
                </span>
            </td>
        `;
    });
}

function filterTable() {
    if (!dataLoaded) return;
    
    const stateFilter = document.getElementById('stateFilter').value;
    const clusterFilter = document.getElementById('clusterFilter').value;
    
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    const filtered = appData.counties.filter(county => {
        const stateMatch = stateFilter === 'all' || county.state === stateFilter;
        const clusterMatch = clusterFilter === 'all' || county.clusterCode === clusterFilter;
        return stateMatch && clusterMatch;
    });
    
    filtered.forEach(county => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${county.name}</td>
            <td>${county.state}</td>
            <td>${(county.poverty * 100).toFixed(1)}%</td>
            <td>${(county.assistance * 100).toFixed(1)}%</td>
            <td style="color: ${county.misalignment > 0 ? '#e74c3c' : '#2ecc71'}">
                ${county.misalignment > 0 ? '+' : ''}${county.misalignment.toFixed(2)}
            </td>
            <td>
                <span class="cluster-badge cluster-${county.clusterCode}">
                    ${county.clusterLabel}
                </span>
            </td>
        `;
    });
    
    // Update count display
    document.querySelector('.filter-info').textContent = 
        `Showing ${filtered.length} of ${appData.counties.length} counties`;
}

function sortTable(columnIndex) {
    if (!dataLoaded) return;
    
    const tbody = document.getElementById('tableBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    const sortedRows = rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent;
        const bValue = b.cells[columnIndex].textContent;
        
        // Check if numeric
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }
        
        return aValue.localeCompare(bValue);
    });
    
    tbody.innerHTML = '';
    sortedRows.forEach(row => tbody.appendChild(row));
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Poverty Dashboard initializing...');
    
    // Set up Chart.js defaults
    Chart.defaults.font.family = "'Public Sans', sans-serif";
    Chart.defaults.color = '#2c3e50';
    
    // Load all data
    const loaded = await loadAllData();
    
    if (loaded) {
        console.log('Dashboard ready');
    } else {
        console.error('Dashboard failed to initialize');
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (map) {
        map.invalidateSize();
    }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatPercent(value) {
    return (value * 100).toFixed(1) + '%';
}

function formatNumber(value, decimals = 2) {
    return value.toFixed(decimals);
}

// Export functions for HTML
window.showSection = showSection;
window.updateMap = updateMap;
window.filterTable = filterTable;
window.sortTable = sortTable;
