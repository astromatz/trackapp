// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker registriert'))
            .catch(err => console.log('Service Worker Fehler:', err));
    });
}

// PWA Install Prompt
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
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
    const dateInput = document.getElementById('datum');
    if (dateInput) dateInput.valueAsDate = new Date();
    
    const geschlechtEl = document.getElementById('geschlecht');
    const groesseEl = document.getElementById('groesse');
    if (geschlechtEl) geschlechtEl.value = settings.geschlecht || '';
    if (groesseEl) groesseEl.value = settings.groesse || '';
    
    updateCharts();
    updateDataTable();
});

// Tab-Wechsel
function switchTab(tabName, ev) {
    const evt = ev || (typeof event !== 'undefined' ? event : null);
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }
    const tabEl = document.getElementById(tabName);
    if (tabEl) tabEl.classList.add('active');
    
    if (tabName === 'ergebnisse') updateCharts();
    if (tabName === 'daten') updateDataTable();
}

// KORRIGIERT: Hilfsfunktion sucht nur NACH Werten VOR dem angegebenen Datum
function getLastValidValue(field, beforeDate) {
    if (measurements.length === 0) return null;
    
    const targetDate = new Date(beforeDate);
    
    // Filtere nur Messungen VOR dem Zieldatum und sortiere nach Datum (neueste zuerst)
    const sorted = [...measurements]
        .filter(m => new Date(m.datum) < targetDate)
        .sort((a, b) => new Date(b.datum) - new Date(a.datum));
    
    // Finde ersten Eintrag mit gültigem Wert
    for (let m of sorted) {
        const value = m[field];
        if (value !== null && value !== undefined && typeof value === 'number' && !isNaN(value) && value > 0) {
            return value;
        }
    }
    return null;
}

// KORRIGIERT: Messung speichern - speichert null statt Auto-Fill Werte
function saveMeasurement() {
    const datum = document.getElementById('datum').value;
    const gewicht = parseFloat(document.getElementById('gewicht').value);
    const muskelanteilInput = document.getElementById('muskelanteil').value;
    const fettanteilInput = document.getElementById('fettanteil').value;
    
    if (!datum || !gewicht || isNaN(gewicht)) {
        alert('Bitte gib mindestens Datum und Gewicht ein!');
        return;
    }
    
    if (!settings.groesse) {
        alert('Bitte gib zuerst deine Körpergröße in den Einstellungen an!');
        switchTab('einstellungen');
        return;
    }
    
    // Parse optional inputs - wenn leer, speichere null statt Wert
    let muskelanteil = null;
    let fettanteil = null;
    
    if (muskelanteilInput !== '' && !isNaN(parseFloat(muskelanteilInput))) {
        muskelanteil = parseFloat(muskelanteilInput);
    }
    
    if (fettanteilInput !== '' && !isNaN(parseFloat(fettanteilInput))) {
        fettanteil = parseFloat(fettanteilInput);
    }
    
    const groesseM = settings.groesse / 100;
    const bmi = gewicht / (groesseM * groesseM);
    
    const existingIndex = measurements.findIndex(m => m.datum === datum);
    
    const measurement = {
        datum,
        gewicht,
        muskelanteil,
        fettanteil,
        bmi: parseFloat(bmi.toFixed(1))
    };
    
    if (existingIndex >= 0) {
        measurements[existingIndex] = measurement;
    } else {
        measurements.push(measurement);
    }
    
    measurements.sort((a, b) => new Date(a.datum) - new Date(b.datum));
    
    localStorage.setItem('measurements', JSON.stringify(measurements));
    
    document.getElementById('gewicht').value = '';
    document.getElementById('muskelanteil').value = '';
    document.getElementById('fettanteil').value = '';
    
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

function setTimeRange(days, ev) {
    currentTimeRange = days;
    customRangeActive = false;
    
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    const evt = ev || (typeof event !== 'undefined' ? event : null);
    if (evt && evt.target) evt.target.classList.add('active');
    
    const cr = document.getElementById('customRange');
    if (cr) cr.classList.remove('active');
    
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
        dateTo.setHours(23, 59, 59, 999);
        
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
    
    return filtered.sort((a, b) => new Date(a.datum) - new Date(b.datum));
}

// Charts
let chartGewicht, chartMuskel, chartFett, chartBMI;

function updateCharts() {
    const data = getFilteredData();
    
    if (data.length === 0) {
        ['chartGewicht', 'chartMuskel', 'chartFett', 'chartBMI'].forEach(id => {
            const canvas = document.getElementById(id);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Keine Daten verfügbar', canvas.width / 2, canvas.height / 2);
        });
        return;
    }
    
    const labels = data.map(m => formatDate(m.datum));
    const gewichtData = data.map(m => m.gewicht);
    const bmiData = data.map(m => m.bmi);
    
    // Forward-Fill Funktion: erst ab dem ersten echten Wert
    function forwardFillAfterFirstValue(series) {
        let lastValid = null;
        let firstFound = false;
        
        return series.map(v => {
            if (v !== null && v !== undefined && typeof v === 'number' && !isNaN(v) && v > 0) {
                lastValid = v;
                firstFound = true;
                return v;
            } else {
                return firstFound ? lastValid : null;
            }
        });
    }
    
    // Rohserien mit null für fehlende Werte
    const muskelRaw = data.map(m => {
        const val = m.muskelanteil;
        return (val !== null && val !== undefined && typeof val === 'number' && !isNaN(val) && val > 0) ? val : null;
    });
    
    const fettRaw = data.map(m => {
        const val = m.fettanteil;
        return (val !== null && val !== undefined && typeof val === 'number' && !isNaN(val) && val > 0) ? val : null;
    });
    
    // Forward-Fill anwenden
    const muskelDataFF = forwardFillAfterFirstValue(muskelRaw);
    const fettDataFF = forwardFillAfterFirstValue(fettRaw);
    
    // Trim führende Nulls
    function trimLeadingNulls(labelsArr, ...seriesArr) {
        let firstIndex = 0;
        const n = labelsArr.length;
        
        outer: for (; firstIndex < n; firstIndex++) {
            for (const s of seriesArr) {
                if (s[firstIndex] != null) break outer;
            }
        }
        
        return {
            labels: labelsArr.slice(firstIndex),
            series: seriesArr.map(s => s.slice(firstIndex))
        };
    }
    
    const trimmedMuskelFett = trimLeadingNulls(labels, muskelDataFF, fettDataFF);
    
    // Gewicht Chart
    updateChart('chartGewicht', chartGewicht, labels, gewichtData, 'Gewicht (kg)', '#3b82f6', null);
    
    // Muskelanteil Chart
    const muskelRange = getHealthyMuscleRange();
    updateChart('chartMuskel', chartMuskel, trimmedMuskelFett.labels, trimmedMuskelFett.series[0], 'Muskelanteil (%)', '#10b981', muskelRange);
    document.getElementById('muskelLabel').style.display = muskelRange ? 'block' : 'none';
    
    // Fettanteil Chart
    const fettRange = getHealthyFatRange();
    updateChart('chartFett', chartFett, trimmedMuskelFett.labels, trimmedMuskelFett.series[1], 'Fettanteil (%)', '#f59e0b', fettRange);
    document.getElementById('fettLabel').style.display = fettRange ? 'block' : 'none';
    
    // BMI Chart
    const bmiRange = { min: 18.5, max: 24.9 };
    updateChart('chartBMI', chartBMI, labels, bmiData, 'BMI', '#8b5cf6', bmiRange);
    document.getElementById('bmiLabel').style.display = 'block';
}

function updateChart(canvasId, chartInstance, labels, data, label, color, healthyRange) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
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
        pointHoverRadius: 6,
        spanGaps: true
    }];
    
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
                        font: { size: 10 }
                    }
                },
                x: {
                    ticks: {
                        font: { size: 9 },
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
    
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
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Noch keine Messungen vorhanden</p>';
        return;
    }
    
    const sorted = [...measurements].sort((a, b) => new Date(b.datum) - new Date(a.datum));
    
    let html = '<div class="data-table"><table><thead><tr>';
    html += '<th>Datum</th><th>Gewicht</th><th>Muskel</th><th>Fett</th><th>BMI</th><th>Aktion</th>';
    html += '</tr></thead><tbody>';
    
    sorted.forEach(m => {
        html += '<tr>';
        html += `<td>${formatDateFull(m.datum)}</td>`;
        html += `<td>${m.gewicht.toFixed(1)} kg</td>`;
        html += `<td>${m.muskelanteil !== null && m.muskelanteil > 0 ? m.muskelanteil.toFixed(1) + '%' : '-'}</td>`;
        html += `<td>${m.fettanteil !== null && m.fettanteil > 0 ? m.fettanteil.toFixed(1) + '%' : '-'}</td>`;
        html += `<td>${m.bmi.toFixed(1)}</td>`;
        html += `<td><button onclick="deleteMeasurement('${m.datum}')" class="delete-btn">Löschen</button></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
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
        updateCharts();
        updateDataTable();
    }
}

// Export/Import
function exportData() {
    const dataStr = JSON.stringify({ measurements, settings }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gewichtsdaten_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importData() {
    document.getElementById('importFile').click();
}

document.getElementById('importFile')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            if (data.measurements && Array.isArray(data.measurements)) {
                measurements = data.measurements;
                localStorage.setItem('measurements', JSON.stringify(measurements));
            }
            
            if (data.settings && typeof data.settings === 'object') {
                settings = data.settings;
                localStorage.setItem('settings', JSON.stringify(settings));
                
                document.getElementById('geschlecht').value = settings.geschlecht || '';
                document.getElementById('groesse').value = settings.groesse || '';
            }
            
            updateCharts();
            updateDataTable();
            alert('Daten erfolgreich importiert!');
        } catch (error) {
            alert('Fehler beim Importieren: Ungültige Datei');
        }
    };
    reader.readAsText(file);
});
