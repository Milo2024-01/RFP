let currentRecordId = null;
let yieldChart = null;

async function analyze() {
    const file = document.getElementById("imageInput").files[0];
    const width = parseFloat(document.getElementById("fieldWidth").value);
    const height = parseFloat(document.getElementById("fieldHeight").value);
    const location = document.getElementById("location").value;
    const FERTILIZER_RATE = 50;
    
    document.getElementById("validationAlert").style.display = "none";
    document.getElementById("submitStatus").classList.add("d-none");
    const analyzeButton = document.getElementById("analyzeButton");
    const analyzeSpinner = document.getElementById("analyzeSpinner");
    
    if (!file) {
        showAlert("Please upload an image first");
        return;
    }
    
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type.toLowerCase())) {
        showAlert("Only JPG, JPEG, and PNG files are allowed");
        return;
    }
    
    if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
        showAlert("Please enter valid width and height values");
        return;
    }

    try {
        analyzeButton.disabled = true;
        analyzeSpinner.style.display = "inline-block";
        
        const formData = new FormData();
        formData.append("image", file);
        formData.append("width", width);
        formData.append("height", height);
        if (location) formData.append("location", location);

        const response = await fetch("http://localhost:8000/analyze", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            let errorMsg = "Analysis failed";
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorData.message || errorMsg;
            } catch (e) {
                errorMsg = `${response.status} ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        
        if (data.error) {
            showAlert(data.error);
            return;
        }
        
        document.getElementById("results").classList.remove("d-none");
        document.getElementById("preview").src = URL.createObjectURL(file);
        document.getElementById("result").src = `data:image/png;base64,${data.processed_image}`;

        const unhealthyArea = data.stats.unhealthy;
        const fertilizerGrams = unhealthyArea * FERTILIZER_RATE;
        const fertilizerKg = fertilizerGrams / 1000;
        const totalArea = width * height;

        document.getElementById("healthyArea").textContent = `${data.stats.healthy.toFixed(2)}m²`;
        document.getElementById("healthyPercent").textContent = 
            `${((data.stats.healthy/totalArea)*100).toFixed(1)}%`;
        document.getElementById("healthyBar").style.width = `${(data.stats.healthy/totalArea)*100}%`;
        
        document.getElementById("mediumArea").textContent = `${data.stats.medium.toFixed(2)}m²`;
        document.getElementById("mediumPercent").textContent = 
            `${((data.stats.medium/totalArea)*100).toFixed(1)}%`;
        document.getElementById("mediumBar").style.width = `${(data.stats.medium/totalArea)*100}%`;
        
        document.getElementById("unhealthyArea").textContent = `${unhealthyArea.toFixed(2)}m²`;
        document.getElementById("unhealthyPercent").textContent = 
            `${((unhealthyArea/totalArea)*100).toFixed(1)}%`;
        document.getElementById("unhealthyBar").style.width = `${(unhealthyArea/totalArea)*100}%`;

        document.getElementById("totalYield").textContent = `${data.estimated_yield.toFixed(2)} kg`;
        document.getElementById("totalFertilizer").textContent = 
            `${fertilizerGrams.toFixed(1)}g (${fertilizerKg.toFixed(2)}kg)`;
        
        if (data.model_type === "ML") {
            document.getElementById("modelBadge").classList.remove("d-none");
        } else {
            document.getElementById("modelBadge").classList.add("d-none");
        }
        
        updateModelExplanation(data.model_type === "ML");
        
        currentRecordId = data.record_id;
        
        // Load history
        await loadPredictionHistory();

    } catch (error) {
        showAlert(`Error: ${error.message}`);
    } finally {
        analyzeButton.disabled = false;
        analyzeSpinner.style.display = "none";
    }
}

async function saveActualYield() {
    const actualYield = parseFloat(document.getElementById("actualYield").value);
    const submitButton = document.getElementById("submitYieldButton");
    const submitSpinner = document.getElementById("submitSpinner");
    
    if (isNaN(actualYield) || actualYield <= 0) {
        showAlert("Please enter a valid yield amount");
        return;
    }
    
    if (!currentRecordId) {
        showAlert("No analysis record found. Please analyze a field first.");
        return;
    }

    try {
        submitButton.disabled = true;
        submitSpinner.style.display = "inline-block";
        
        const response = await fetch("http://localhost:8000/save_actual_yield", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                actualYield: actualYield,
                record_id: currentRecordId
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to save data");
        }
        
        document.getElementById("submitStatus").classList.remove("d-none");
        document.getElementById("actualYield").value = "";
        
        setTimeout(async () => {
            await loadPredictionHistory();
        }, 500);
        
    } catch (error) {
        showAlert("Error saving data: " + error.message);
    } finally {
        submitButton.disabled = false;
        submitSpinner.style.display = "none";
    }
}

function showAlert(message) {
    const alert = document.getElementById("validationAlert");
    document.getElementById("alertMessage").textContent = message;
    alert.style.display = "block";
    
    setTimeout(() => {
        alert.style.display = "none";
    }, 5000);
}

function updateModelExplanation(isML) {
    document.getElementById("modelExplanation").classList.toggle("d-none", isML);
    document.getElementById("mlExplanation").classList.toggle("d-none", !isML);
}

async function loadPredictionHistory() {
    try {
        const refreshButton = document.getElementById("refreshHistoryButton");
        const refreshSpinner = document.getElementById("refreshSpinner");
        
        refreshButton.disabled = true;
        refreshSpinner.style.display = "inline-block";
        
        const response = await fetch("http://localhost:8000/history");
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to load history");
        }
        
        const history = await response.json();
        const container = document.getElementById("predictionHistory");
        container.innerHTML = "";
        
        if (history.length === 0) {
            container.innerHTML = `<p class="text-center text-muted my-4" id="emptyHistory">
                <i class="bi bi-clock-history"></i><br>
                No historical predictions yet
            </p>`;
            return;
        }
        
        history.forEach(item => {
            const date = new Date(item.timestamp);
            const formattedDate = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;
            const time = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const card = document.createElement("div");
            card.className = "history-card";
            
            let modelBadge = "";
            if (item.model_type === "ML") {
                modelBadge = `<span class="badge bg-success float-end">ML Model</span>`;
            } else {
                modelBadge = `<span class="badge bg-secondary float-end">Linear Model</span>`;
            }
            
            let actualYieldHtml = "";
            if (item.actual_yield) {
                const diff = item.actual_yield - item.predicted_yield;
                // Handle floating-point precision
                const roundedDiff = Math.round(diff * 100) / 100;
                const diffPercent = (roundedDiff / item.predicted_yield) * 100;
                const roundedPercent = Math.round(diffPercent * 10) / 10;
                
                // Check if difference is effectively zero
                if (Math.abs(roundedDiff) < 0.001) {
                    actualYieldHtml = `
                        <div class="mt-2">
                            <div class="exact-match">
                                <strong>Actual:</strong> ${item.actual_yield.toFixed(2)} kg
                                <span class="ms-2">(exact match)</span>
                            </div>
                        </div>
                    `;
                } else {
                    // Determine sign class and symbol
                    const diffClass = roundedDiff > 0 ? "text-success" : "text-danger";
                    const signSymbol = roundedDiff > 0 ? "+" : "";
                    
                    actualYieldHtml = `
                        <div class="mt-2">
                            <div class="${diffClass}">
                                <strong>Actual:</strong> ${item.actual_yield.toFixed(2)} kg
                                <span class="ms-2">(${signSymbol}${roundedDiff.toFixed(2)} kg, ${signSymbol}${Math.abs(roundedPercent).toFixed(1)}%)</span>
                            </div>
                        </div>
                    `;
                }
            } else {
                actualYieldHtml = `
                    <div class="text-muted small mt-2">
                        Awaiting actual yield submission
                    </div>
                `;
            }
            
            card.innerHTML = `
                <div class="d-flex justify-content-between">
                    <div>
                        <strong>${formattedDate}</strong>
                        <div class="text-muted small">${time} • ${item.location || 'N/A'}</div>
                    </div>
                    ${modelBadge}
                </div>
                <div class="mt-2">
                    <div><strong>Predicted:</strong> ${item.predicted_yield.toFixed(2)} kg</div>
                    ${actualYieldHtml}
                </div>
            `;
            container.appendChild(card);
        });
        
        // Update chart with new data
        updateChart(history);
        
    } catch (error) {
        console.error("Error loading history:", error);
        showAlert("Failed to load prediction history: " + error.message);
    } finally {
        const refreshButton = document.getElementById("refreshHistoryButton");
        const refreshSpinner = document.getElementById("refreshSpinner");
        if (refreshButton && refreshSpinner) {
            refreshButton.disabled = false;
            refreshSpinner.style.display = "none";
        }
    }
}

// Event listener for image input validation
document.getElementById("imageInput").addEventListener("change", function(e) {
    const file = e.target.files[0];
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    
    if (file && !validTypes.includes(file.type.toLowerCase())) {
        showAlert("Only JPG, JPEG, and PNG files are allowed");
        e.target.value = "";
    }
});