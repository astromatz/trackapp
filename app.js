// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registriert'))
            .catch(err => console.log('Service Worker Fehler:', err));
    });
}

// PWA Install Prompt
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Prüfe ob bereits installiert oder dismissed
    if (!localStorage.getItem('installDismissed')) {
        installPrompt.classList.add('show');
    }
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('App installiert');
            }
            deferredPrompt = null;
            installPrompt.classList.remove('show');
        });
    }
}

function dismissInstall() {
    localStorage.setItem('installDismissed', 'true');
    installPrompt.classList.remove('show');
}

// Daten-Management
let measurements = JSON.parse(localStorage.getItem('measurements')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    geschlecht: '',
    groesse: ''
};

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    // Setze heutiges Datum
    document.getElementById('datum').valueAsDate = new Date();
    
    // Lade Einstellungen
    document.getElementById('geschlecht').value = settings.geschlecht || '';
    document.getElementById('groesse').value = settings.groesse || '';
    
    // Initialisiere Charts
    updateCharts();
    updateDataTable();
});

// Tab-Wechsel
function switchTab(tabName) {
    // Entferne active von allen Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Aktiviere gewählten Tab
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // Update Charts wenn Ergebnisse-Tab geöffnet wird
    if (tabName === 'ergebnisse') {
        updateCharts();
    }
    
    // Update Tabelle wenn Daten-Tab geöffnet wird
    if (tabName === 'daten') {
        updateDataTable();
    }
}

// Messung speichern
function saveMeasurement() {
    const datum = document.getElementById('datum').value;
    const gewicht = parseFloat(document.getElementById('gewicht').value);
    const muskelanteil = parseFloat(document.getElementById('muskelanteil').value);
    const fettanteil = parseFloat(document.getElementById('fettanteil').value);
    
    if (!datum || !gewicht || !muskelanteil || !fettanteil) {
        alert('Bitte fülle alle Felder aus!');
        return;
    }
    
    if (!settings.groesse) {
        alert('Bitte gib zuerst deine Körpergröße in den Einstellungen an!');
        switchTab('einstellungen');
        return;
    }
    
    // Berechne BMI
    const groesseM = settings.groesse / 100;
    const bmi = gewicht / (groesseM * groesseM);
    
    // Prüfe ob Datum bereits existiert
    const existingIndex = measurements.findIndex(m => m.datum === datum);
    
    const measurement = {
        datum,
        gewicht,
        muskelanteil,
        fettanteil,
        bmi: parseFloat(bmi.toFixed(1))
    };
    
    if (existingIndex >= 0) {
        // Update existing
        measurements[existingIndex] = measurement;
    } else {
        // Add new
        measurements.push(measurement);
    }
    
    // Sortiere nach Datum
    measurements.sort((a, b) => new Date(a.datum) - new Date(b.datum));
    
    // Speichern
    localStorage.setItem('measurements', JSON.stringify(measurements));
    
    // Felder leeren
    document.getElementById('gewicht').value = '';
    document.getElementById('muskelanteil').value = '';
    document.getElementById('fettanteil').value = '';
    
    // Setze Datum auf morgen
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('datum').valueAsDate = tomorrow;
    
    alert('Messung gespeichert!');
    updateCharts();
    updateDataTable();
}

// Einstellungen speichern
function saveSettings() {
    const geschlecht = document.getElementById('geschlecht').value;
    const groesse = parseFloat(document.getElementById('groesse').value);
    
    if (!geschlecht || !groesse) {
        alert('Bitte fülle alle Felder aus!');
        return;
    }
    
    settings = { geschlecht, groesse };
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Recalculate BMI for all measurements
    measurements = measurements.map(m => {
        const groesseM = groesse / 100;
        const bmi = m.gewicht / (groesseM * groesseM);
        return { ...m, bmi: parseFloat(bmi.toFixed(1)) };
    });
    
    localStorage.setItem('measurements', JSON.stringify(measurements));
    
    alert('Einstellungen gespeichert!');
    updateCharts();
    updateDataTable();
}

// Zeitraum-Verwaltung
let currentTimeRange = 7;
let customRangeActive = false;

function setTimeRange(days) {
    currentTimeRange = days;
    customRangeActive = false;
    
    // Update Button States
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Hide custom range
    document.getElementById('customRange').classList.remove('active');
    
    updateCharts();
}

function toggleCustomRange() {
    const customRange = document.getElementById('customRange');
    const customBtn = document.getElementById('customBtn');
    
    if (customRange.classList.contains('active')) {
        customRange.classList.remove('active');
        customBtn.classList.remove('active');
        customRangeActive = false;
    } else {
        customRange.classList.add('active');
        customBtn.classList.add('active');
        
        // Set default dates
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        document.getElementById('dateTo').valueAsDate = today;
        document.getElementById('dateFrom').valueAsDate = monthAgo;
    }
}

function applyCustomRange() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    if (!dateFrom || !dateTo) {
        alert('Bitte wähle beide Daten aus!');
        return;
    }
    
    if (new Date(dateFrom) > new Date(dateTo)) {
        alert('Das Start-Datum muss vor dem End-Datum liegen!');
        return;
    }
    
    customRangeActive = true;
    
    // Update button states
    document.querySelectorAll('.time-btn').forEach(btn => {
        if (btn.id !== 'customBtn') {
            btn.classList.remove('active');
        }
    });
    
    updateCharts();
}

// Daten filtern nach Zeitraum
function getFilteredData() {
    if (measurements.length === 0) return [];
    
    let filtered;
    
    if (customRangeActive) {
        const dateFrom = new Date(document.getElementById('dateFrom').value);
        const dateTo = new Date(document.getElementById('dateTo').value);
        dateTo.setHours(23, 59, 59, 999); // Include entire day
        
        filtered = measurements.filter(m => {
            const mDate = new Date(m.datum);
            return mDate >= dateFrom && mDate <= dateTo;
        });
    } else {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - currentTimeRange);
        startDate.setHours(0, 0, 0, 0);
        
        filtered = measurements.filter(m => {
            const mDate = new Date(m.datum);
            return mDate >= startDate && mDate <= today;
        });
    }
    
    // Sortiere chronologisch
    return filtered.sort((a, b) => new Date(a.datum) - new Date(b.datum));
}

// Charts
let chartGewicht, chartMuskel, chartFett, chartBMI;

function updateCharts() {
    const data = getFilteredData();
    
    if (data.length === 0) {
        // Zeige "Keine Daten" Nachricht
        ['chartGewicht', 'chartMuskel', 'chartFett', 'chartBMI'].forEach(id => {
            const canvas = document.getElementById(id);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#999';
            ctx.textAlign = 'center';
            ctx.fillText('Keine Daten verfügbar', canvas.width / 2, canvas.height / 2);
        });
        return;
    }
    
    // Extrahiere und formatiere Daten
    const labels = data.map(m => formatDate(m.datum));
    const gewichtData = data.map(m => m.gewicht);
    const muskelData = data.map(m => m.muskelanteil);
    const fettData = data.map(m => m.fettanteil);
    const bmiData = data.map(m => m.bmi);
    
    // Gewicht Chart
    updateChart('chartGewicht', chartGewicht, labels, gewichtData, 'Gewicht (kg)', '#3b82f6', null);
    
    // Muskelanteil Chart mit gesundem Bereich
    const muskelRange = getHealthyMuscleRange();
    updateChart('chartMuskel', chartMuskel, labels, muskelData, 'Muskelanteil (%)', '#10b981', muskelRange);
    document.getElementById('muskelLabel').style.display = muskelRange ? 'block' : 'none';
    
    // Fettanteil Chart mit gesundem Bereich
    const fettRange = getHealthyFatRange();
    updateChart('chartFett', chartFett, labels, fettData, 'Fettanteil (%)', '#f59e0b', fettRange);
    document.getElementById('fettLabel').style.display = fettRange ? 'block' : 'none';
    
    // BMI Chart mit gesundem Bereich
    const bmiRange = { min: 18.5, max: 24.9 };
    updateChart('chartBMI', chartBMI, labels, bmiData, 'BMI', '#8b5cf6', bmiRange);
    document.getElementById('bmiLabel').style.display = 'block';
}

function updateChart(canvasId, chartInstance, labels, data, label, color, healthyRange) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Destroy existing chart
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    const datasets = [{
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: color + '20',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
    }];
    
    // Add healthy range if provided
    if (healthyRange) {
        datasets.push({
            label: 'Gesunder Bereich (Min)',
            data: new Array(data.length).fill(healthyRange.min),
            borderColor: '#22c55e',
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0
        });
        
        datasets.push({
            label: 'Gesunder Bereich (Max)',
            data: new Array(data.length).fill(healthyRange.max),
            borderColor: '#22c55e',
            borderWidth: 1,
            borderDash: [5, 5],
            fill: '-1',
            backgroundColor: '#22c55e10',
            pointRadius: 0,
            pointHoverRadius: 0
        });
    }
    
    const newChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return label + ': ' + context.parsed.y.toFixed(1);
                            }
                            return null;
                        }
                    },
                    filter: function(tooltipItem) {
                        return tooltipItem.datasetIndex === 0;
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 9
                        },
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
    
    // Update global chart reference
    if (canvasId === 'chartGewicht') chartGewicht = newChart;
    if (canvasId === 'chartMuskel') chartMuskel = newChart;
    if (canvasId === 'chartFett') chartFett = newChart;
    if (canvasId === 'chartBMI') chartBMI = newChart;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}.${month}`;
}

// Gesunde Bereiche (WHO Standards)
function getHealthyMuscleRange() {
    if (!settings.geschlecht) return null;
    
    if (settings.geschlecht === 'mann') {
        return { min: 33, max: 39 };
    } else {
        return { min: 28, max: 34 };
    }
}

function getHealthyFatRange() {
    if (!settings.geschlecht) return null;
    
    if (settings.geschlecht === 'mann') {
        return { min: 10, max: 20 };
    } else {
        return { min: 18, max: 28 };
    }
}

// Daten-Tabelle
function updateDataTable() {
    const container = document.getElementById('dataTableContainer');
    
    if (measurements.length === 0) {
        container.innerHTML = '<div class="no-data">Noch keine Daten vorhanden</div>';
        return;
    }
    
    // Sortiere absteigend (neueste zuerst)
    const sortedData = [...measurements].sort((a, b) => new Date(b.datum) - new Date(a.datum));
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Datum</th>
                    <th>Gewicht</th>
                    <th>Muskel</th>
                    <th>Fett</th>
                    <th>BMI</th>
                    <th>Aktion</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sortedData.forEach((m, index) => {
        html += `
            <tr>
                <td>${formatDateFull(m.datum)}</td>
                <td>${m.gewicht.toFixed(1)} kg</td>
                <td>${m.muskelanteil.toFixed(1)}%</td>
                <td>${m.fettanteil.toFixed(1)}%</td>
                <td>${m.bmi.toFixed(1)}</td>
                <td><button class="delete-btn" onclick="deleteMeasurement('${m.datum}')">Löschen</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function formatDateFull(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function deleteMeasurement(datum) {
    if (confirm('Möchtest du diese Messung wirklich löschen?')) {
        measurements = measurements.filter(m => m.datum !== datum);
        localStorage.setItem('measurements', JSON.stringify(measurements));
        updateDataTable();
        updateCharts();
    }
}

// Alle Daten löschen
function showDeleteModal() {
    document.getElementById('deleteModal').classList.add('active');
}

function hideDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
}

function confirmDeleteAllData() {
    measurements = [];
    localStorage.setItem('measurements', JSON.stringify(measurements));
    hideDeleteModal();
    updateDataTable();
    updateCharts();
    alert('Alle Daten wurden gelöscht!');
}

// CSV Export
function exportCSV() {
    if (measurements.length === 0) {
        alert('Keine Daten zum Exportieren vorhanden!');
        return;
    }
    
    let csv = 'Datum,Gewicht (kg),Muskelanteil (%),Fettanteil (%),BMI\n';
    
    measurements.forEach(m => {
        csv += `${m.datum},${m.gewicht},${m.muskelanteil},${m.fettanteil},${m.bmi}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gesundheitsdaten_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// CSV Import
function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        
        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const [datum, gewicht, muskelanteil, fettanteil, bmi] = line.split(',');
            
            if (datum && gewicht && muskelanteil && fettanteil && bmi) {
                const measurement = {
                    datum,
                    gewicht: parseFloat(gewicht),
                    muskelanteil: parseFloat(muskelanteil),
                    fettanteil: parseFloat(fettanteil),
                    bmi: parseFloat(bmi)
                };
                
                // Prüfe ob Datum bereits existiert
                const existingIndex = measurements.findIndex(m => m.datum === datum);
                if (existingIndex >= 0) {
                    measurements[existingIndex] = measurement;
                } else {
                    measurements.push(measurement);
                }
            }
        }
        
        // Sortiere nach Datum
        measurements.sort((a, b) => new Date(a.datum) - new Date(b.datum));
        
        localStorage.setItem('measurements', JSON.stringify(measurements));
        updateDataTable();
        updateCharts();
        alert('Daten erfolgreich importiert!');
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}