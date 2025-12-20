// ============================================================================
// POVERTY DASHBOARD - INTERACTIVE WEB APPLICATION
// ============================================================================

// Sample data structure (in production, load from JSON files)
const sampleData = {
    counties: [
        // Sample counties for demonstration
        { name: "Jefferson", state: "AL", poverty: 0.175, assistance: 0.142, misalignment: 0.35, cluster: "high-under", geoid: "01073" },
        { name: "Mobile", state: "AL", poverty: 0.185, assistance: 0.165, misalignment: 0.12, cluster: "high-high", geoid: "01097" },
        { name: "Madison", state: "AL", poverty: 0.125, assistance: 0.095, misalignment: 0.25, cluster: "low-low", geoid: "01089" },
        { name: "Pulaski", state: "AR", poverty: 0.168, assistance: 0.195, misalignment: -0.42, cluster: "low-high", geoid: "05119" },
        { name: "Miami-Dade", state: "FL", poverty: 0.155, assistance: 0.125, misalignment: 0.28, cluster: "high-under", geoid: "12086" },
        { name: "Fulton", state: "GA", poverty: 0.145, assistance: 0.132, misalignment: 0.08, cluster: "low-high", geoid: "13121" },
        { name: "Jefferson", state: "KY", poverty: 0.138, assistance: 0.145, misalignment: -0.15, cluster: "low-high", geoid: "21111" },
        { name: "Orleans", state: "LA", poverty: 0.245, assistance: 0.235, misalignment: 0.05, cluster: "high-high", geoid: "22071" },
        { name: "Hinds", state: "MS", poverty: 0.225, assistance: 0.175, misalignment: 0.65, cluster: "high-under", geoid: "28049" },
        { name: "St. Louis", state: "MO", poverty: 0.115, assistance: 0.095, misalignment: 0.18, cluster: "low-low", geoid: "29189" },
        { name: "Kanawha", state: "WV", poverty: 0.165, assistance: 0.185, misalignment: -0.25, cluster: "low-high", geoid: "54039" }
    ],
    
    // Time series data for trends
    trends: {
        years: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
        overall: [0.168, 0.165, 0.162, 0.159, 0.156, 0.153, 0.158, 0.152, 0.148, 0.143],
        states: {
            MS: [0.220, 0.218, 0.215, 0.213, 0.210, 0.208, 0.212, 0.206, 0.203, 0.199],
            LA: [0.198, 0.195, 0.192, 0.190, 0.187, 0.185, 0.189, 0.183, 0.180, 0.176],
            AR: [0.185, 0.182, 0.179, 0.176, 0.173, 0.170, 0.174, 0.168, 0.165, 0.161],
            KY: [0.182, 0.179, 0.176, 0.173, 0.170, 0.167, 0.171, 0.165, 0.162, 0.158],
            WV: [0.178, 0.175, 0.172, 0.169, 0.166, 0.163, 0.167, 0.161, 0.158, 0.154],
            AL: [0.175, 0.172, 0.169, 0.166, 0.163, 0.160, 0.164, 0.158, 0.155, 0.151],
            GA: [0.165, 0.162, 0.159, 0.156, 0.153, 0.150, 0.154, 0.148, 0.145, 0.141],
            MO: [0.148, 0.145, 0.142, 0.139, 0.136, 0.133, 0.137, 0.131, 0.128, 0.124],
            FL: [0.145, 0.142, 0.139, 0.136, 0.133, 0.130, 0.134, 0.128, 0.125, 0.121]
        }
    }
};

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
    
    // Initialize Leaflet map
    map = L.map('map').setView([32.5, -86.5], 6);
    
    // Add base tile layer with custom style
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
    
    // Load and display initial data
    updateMap();
}

function updateMap() {
    if (!map) return;
    
    const metric = document.getElementById('metricSelect').value;
    const year = document.getElementById('yearSelect').value;
    
    // In production, fetch actual GeoJSON data here
    // For demo, we'll show a loading message
    console.log(`Updating map for ${metric} in ${year}`);
    
    // Remove existing layer if present
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
    }
    
    // In a real implementation, you would:
    // 1. Fetch GeoJSON data from your data files
    // 2. Apply appropriate color scale based on metric
    // 3. Add popups with county information
    // 4. Add legend
    
    // Example of how to add a simple marker (replace with actual GeoJSON)
    sampleData.counties.forEach(county => {
        // Approximate county center (in production, use actual centroids)
        const lat = 32.5 + Math.random() * 6;
        const lng = -86.5 + Math.random() * 8;
        
        let value, color;
        if (metric === 'poverty') {
            value = county.poverty;
            color = getColor(value, 0, 0.4, '#ffffcc', '#bd0026');
        } else if (metric === 'assistance') {
            value = county.assistance;
            color = getColor(value, 0, 0.3, '#eff3ff', '#084594');
        } else if (metric === 'misalignment') {
            value = county.misalignment;
            color = value > 0 ? '#e74c3c' : value < 0 ? '#3498db' : '#95a5a6';
        } else {
            color = getClusterColor(county.cluster);
        }
        
        const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);
        
        marker.bindPopup(`
            <strong>${county.name} County, ${county.state}</strong><br>
            Poverty Rate: ${(county.poverty * 100).toFixed(1)}%<br>
            Assistance Rate: ${(county.assistance * 100).toFixed(1)}%<br>
            Misalignment: ${county.misalignment > 0 ? '+' : ''}${county.misalignment.toFixed(2)}<br>
            Cluster: ${getClusterLabel(county.cluster)}
        `);
    });
}

function getColor(value, min, max, colorStart, colorEnd) {
    // Simple linear interpolation for demo
    const ratio = (value - min) / (max - min);
    return ratio > 0.75 ? '#bd0026' : 
           ratio > 0.5 ? '#f03b20' : 
           ratio > 0.25 ? '#feb24c' : '#ffffcc';
}

function getClusterColor(cluster) {
    const colors = {
        'low-low': '#2ecc71',
        'low-high': '#3498db',
        'high-under': '#e74c3c',
        'high-high': '#f39c12'
    };
    return colors[cluster] || '#95a5a6';
}

function getClusterLabel(cluster) {
    const labels = {
        'low-low': 'Low Need / Low Assistance',
        'low-high': 'Low-Mod Need / High Assistance',
        'high-under': 'High Need / Under-Served',
        'high-high': 'High Need / High Assistance'
    };
    return labels[cluster] || 'Unknown';
}

// ============================================================================
// CHART FUNCTIONALITY
// ============================================================================

let trendChart, stateChart, clusterChart, modelChart, corrChart;

function initializeTrendCharts() {
    if (trendChart) return; // Already initialized
    
    // Poverty rate over time
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: sampleData.trends.years,
            datasets: [{
                label: 'Average Poverty Rate',
                data: sampleData.trends.overall.map(v => v * 100),
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
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 46, 0.95)',
                    titleFont: {
                        family: 'IBM Plex Mono',
                        size: 12
                    },
                    bodyFont: {
                        family: 'Public Sans',
                        size: 14
                    },
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
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            family: 'IBM Plex Mono',
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'IBM Plex Mono',
                            size: 11
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // State comparison
    const stateCtx = document.getElementById('stateChart').getContext('2d');
    const stateLabels = ['MS', 'LA', 'AR', 'KY', 'WV', 'AL', 'GA', 'MO', 'FL'];
    const stateValues = stateLabels.map(state => {
        const data = sampleData.trends.states[state];
        return (data[data.length - 1] * 100).toFixed(1);
    });
    
    stateChart = new Chart(stateCtx, {
        type: 'bar',
        data: {
            labels: stateLabels,
            datasets: [{
                label: '2023 Poverty Rate',
                data: stateValues,
                backgroundColor: '#0f3460',
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 46, 0.95)',
                    titleFont: {
                        family: 'IBM Plex Mono',
                        size: 12
                    },
                    bodyFont: {
                        family: 'Public Sans',
                        size: 14
                    },
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Poverty Rate: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            family: 'IBM Plex Mono',
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'IBM Plex Mono',
                            size: 12
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function initializeClusterChart() {
    if (clusterChart) return;
    
    const clusterCtx = document.getElementById('clusterChart').getContext('2d');
    clusterChart = new Chart(clusterCtx, {
        type: 'radar',
        data: {
            labels: ['Expected Poverty', 'Assistance Rate', 'Misalignment Score'],
            datasets: [
                {
                    label: 'Low Need / Low Assist',
                    data: [11.0, 8.3, 3.7],
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    borderWidth: 2
                },
                {
                    label: 'Low-Mod / High Assist',
                    data: [15.2, 16.1, -40.5],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderWidth: 2
                },
                {
                    label: 'High Need / Under-Served',
                    data: [19.0, 14.3, 53.4],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.2)',
                    borderWidth: 2
                },
                {
                    label: 'High Need / High Assist',
                    data: [25.5, 26.0, -15.4],
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.2)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'IBM Plex Mono',
                            size: 11
                        },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'IBM Plex Mono',
                            size: 10
                        }
                    },
                    pointLabels: {
                        font: {
                            family: 'Public Sans',
                            size: 12,
                            weight: '600'
                        }
                    }
                }
            }
        }
    });
}

function initializeAnalysisCharts() {
    if (modelChart) return;
    
    // Model comparison
    const modelCtx = document.getElementById('modelChart').getContext('2d');
    modelChart = new Chart(modelCtx, {
        type: 'bar',
        data: {
            labels: ['Linear Regression', 'Random Forest'],
            datasets: [
                {
                    label: 'R² Score',
                    data: [0.78, 0.82],
                    backgroundColor: '#e94560',
                    borderRadius: 4
                },
                {
                    label: 'MAE (×100)',
                    data: [2.2, 1.9],
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
                        font: {
                            family: 'IBM Plex Mono',
                            size: 11
                        },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'IBM Plex Mono',
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Public Sans',
                            size: 12
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Correlation chart
    const corrCtx = document.getElementById('corrChart').getContext('2d');
    corrChart = new Chart(corrCtx, {
        type: 'bar',
        data: {
            labels: ['Per Capita Income', 'Bachelors Rate', 'Single Mother Rate', 'Gini Index', 'Unemployment'],
            datasets: [{
                label: 'Correlation with Poverty',
                data: [-0.67, -0.52, 0.63, 0.53, 0.49],
                backgroundColor: (context) => {
                    return context.parsed.y < 0 ? '#2ecc71' : '#e74c3c';
                },
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    min: -1,
                    max: 1,
                    ticks: {
                        font: {
                            family: 'IBM Plex Mono',
                            size: 11
                        }
                    }
                },
                y: {
                    ticks: {
                        font: {
                            family: 'Public Sans',
                            size: 12
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ============================================================================
// DATA TABLE FUNCTIONALITY
// ============================================================================

function initializeDataTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    sampleData.counties.forEach(county => {
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
                <span class="cluster-badge cluster-${county.cluster}">
                    ${getClusterLabel(county.cluster)}
                </span>
            </td>
        `;
    });
}

function filterTable() {
    const stateFilter = document.getElementById('stateFilter').value;
    const clusterFilter = document.getElementById('clusterFilter').value;
    
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    const filtered = sampleData.counties.filter(county => {
        const stateMatch = stateFilter === 'all' || county.state === stateFilter;
        const clusterMatch = clusterFilter === 'all' || county.cluster === clusterFilter;
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
                <span class="cluster-badge cluster-${county.cluster}">
                    ${getClusterLabel(county.cluster)}
                </span>
            </td>
        `;
    });
}

function sortTable(columnIndex) {
    // Simple table sorting implementation
    console.log(`Sorting by column ${columnIndex}`);
    // In production, implement full sorting logic
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Poverty Dashboard initialized');
    
    // Set up Chart.js defaults
    Chart.defaults.font.family = "'Public Sans', sans-serif";
    Chart.defaults.color = '#2c3e50';
    
    // Initialize overview section charts if needed
    // Add any additional initialization here
});

// Handle window resize for responsive charts
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

// Export functions for use in HTML
window.showSection = showSection;
window.updateMap = updateMap;
window.filterTable = filterTable;
window.sortTable = sortTable;