// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('yieldChart').getContext('2d');
    yieldChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Predicted Yield',
                    data: [],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#28a745',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Actual Yield',
                    data: [],
                    borderColor: '#0dcaf0',
                    backgroundColor: 'rgba(13, 202, 240, 0.1)',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#0dcaf0',
                    borderDash: [5, 5],
                    tension: 0.3,
                    fill: true
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
                            size: 13
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Yield Prediction Trends Over Time',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Date',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Yield (kg)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            hover: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

// Update chart with historical data
function updateChart(history) {
    if (!yieldChart) return;
    
    const labels = [];
    const predictedData = [];
    const actualData = [];
    
    // Process history data
    history.forEach(item => {
        const date = new Date(item.timestamp);
        const formattedDate = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
        labels.push(formattedDate);
        predictedData.push(item.predicted_yield);
        actualData.push(item.actual_yield || null);
    });
    
    // Update chart data
    yieldChart.data.labels = labels;
    yieldChart.data.datasets[0].data = predictedData;
    yieldChart.data.datasets[1].data = actualData;
    
    yieldChart.update();
}

// Initialize chart on page load
document.addEventListener('DOMContentLoaded', function() {
    initChart();
    
    // Load history if results are visible (page refresh)
    if (!document.getElementById("results").classList.contains("d-none")) {
        loadPredictionHistory();
    }
});