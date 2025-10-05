let measurements = [];
let currentTimeRange = 7;
let charts = {};
let groesse = 175;
let geschlecht = '';
let deferredPrompt;

// WHO Gesundheitsbereiche
const healthRanges = {
    bmi: {
        mann: { min: 18.5, max: 25 },
        frau: { min: 18.5, max: 25 }
    },
    muskel: {
        mann: { min: 33, max: 39 },
        frau: { min: 28, max: 34 }
    },
    fett: {
        mann: { min: 8, max: 20 },
        frau: { min: 21, max: 33 }
    }
};

// Service Worker registrieren
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registriert'))
            .catch(err => console.log('Service Worker Fehler:', err));
    });
}

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Zeige Install Prompt nur wenn noch nicht installiert
    if (!localStorage.getItem('installDismissed')) {
        document.getElementById('installPrompt').classList.add('show');
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
            document.getElementById('installPrompt').classList.remove('show');
        });
    }
}

function dismissInstall() {
    document.getElementById('installPrompt').classList.remove('show');
    localStorage.setItem('installDismissed', 'true');
}

// Initialisierung
function init() {
    loadData();
    loadSettings();
    setTodayAsDefault();
    updateDataTable();
    updateCharts();
}

// Setze heutiges Datum als Standard
function setTodayAsDefault() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('datum').value = today;
}

// Tab Wechsel
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'ergebnisse') {
        setTimeout(() => updateCharts(), 100);
    }
    if (tabName === 'daten') {
        updateDataTable();
    }
}

// Daten aus LocalStorage laden
function loadData() {
    const data = localStorage.getItem('healthData');
    measurements = data ? JSON.parse(data) : [];
}

// Daten in LocalStorage speichern
function saveData() {
    localStorage.setItem('healthData', JSON.stringify(measurements));
}

// Einstellungen laden
function loadSettings() {
    const savedGroesse = localStorage.getItem('groesse');
    const savedGeschlecht = localStorage.getItem('geschlecht');
    
    if (savedGroesse) {
        groesse = parseFloat(savedGroesse);
        document.getElementById('groesse').value = groesse;
    }
    
    if (savedGeschlecht) {
        geschlecht = savedGeschlecht;
        document.getElementById('geschlecht').value = geschlecht;
    }
}

// Einstellungen speichern
function saveSettings() {
    const inputGroesse = document.getElementById('groesse').value;
    const inputGeschlecht = document.getElementById('geschlecht').value;
    
    if (!inputGroesse || inputGroesse <= 0) {
        alert('Bitte gib eine gültige Körpergröße ein.');
        return;
    }
    
    if (!inputGeschlecht) {
        alert('Bitte wähle dein Geschlecht aus.');
        return;
    }
    
    groesse = parseFloat(inputGroesse);
    geschlecht = inputGeschlecht;
    
    localStorage.setItem('groesse', groesse);
    localStorage.setItem('geschlecht', geschlecht);
    
    alert('Einstellungen gespeichert!');
    updateCharts();
}

// Messung speichern
function saveMeasurement() {
    const datum = document.getElementById('datum').value;
    const gewicht = parseFloat(document.getElementById('gewicht').value);
    const muskel = parseFloat(document.getElementById('muskelanteil').value);
    const fett = parseFloat(document.getElementById('fettanteil').value);
    
    if (!datum) {
        alert('Bitte wähle ein Datum aus!');
        return;
    }
    
    if (!gewicht || !muskel || !fett) {
        alert('Bitte fülle alle Felder aus!');
        return;
    }
    
    // Prüfe ob bereits ein Eintrag für dieses Datum existiert
    const existingIndex = measurements.findIndex(m => m.datum === datum);
    
    if (existingIndex !== -1) {
        // Frage ob überschreiben
        if (confirm(`Für den ${datum} existiert bereits ein Eintrag. Möchtest du ihn überschreiben?`)) {
            measurements[existingIndex] = {
                datum: datum,
                gewicht: gewicht,
                muskelanteil: muskel,
                fettanteil: fett,
                id: measurements[existingIndex].id
            };
        } else {
            return;
        }
    } else {
        // Neuen Eintrag hinzufügen
        const measurement = {
            datum: datum,
            gewicht: gewicht,
            muskelanteil: muskel,
            fettanteil: fett,
            id: Date.now()
        };
        measurements.push(measurement);
    }
    
    saveData();
    
    // Felder leeren (außer Datum)
    document.getElementById('gewicht').value = '';
    document.getElementById('muskelanteil').value = '';
    document.getElementById('fettanteil').value = '';
    
    alert('✅ Daten gespeichert!');
    
    // Aktualisiere Tabelle falls im Daten-Tab
    if (document.getElementById('daten').classList.contains('active')) {
        updateDataTable();
    }
}

// Zeitraum setzen
function setTimeRange(days) {
    currentTimeRange = days;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('customRange').classList.remove('active');
    document.getElementById('customBtn').classList.remove('active');
    updateCharts();
}

// Individuellen Zeitraum toggle
function toggleCustomRange() {
    const customRange = document.getElementById('customRange');
    const isActive = customRange.classList.toggle('active');
    document.getElementById('customBtn').classList.toggle('active');
    
    if (isActive) {
        document.querySelectorAll('.time-btn').forEach(b => {
            if (b.id !== 'customBtn') b.classList.remove('active');
        });
        
        // Setze Standardwerte
        const today = new Date().toISOString().split('T')[0];
        const lastMonth = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
        document.getElementById('dateTo').value = today;
        document.getElementById('dateFrom').value = lastMonth;
    }
}

// Individuellen Zeitraum anwenden
function applyCustomRange() {
    const from = document.getElementById('dateFrom').value;
    const to = document.getElementById('dateTo').value;
    
    if (!from || !to) {
        alert('Bitte wähle beide Daten aus!');
        return;
    }
    
    currentTimeRange = { from: from, to: to };
    updateCharts();
}

// Gefilterte Daten abrufen
function getFilteredData() {
    if (typeof currentTimeRange === 'object') {
        return measurements.filter(m => 
            m.datum >= currentTimeRange.from && m.datum <= currentTimeRange.to
        ).sort((a, b) => new Date(a.datum) - new Date(b.datum));
    } else {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - currentTimeRange);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        
        return measurements.filter(m => m.datum >= cutoffStr)
            .sort((a, b) => new Date(a.datum) - new Date(b.datum));
    }
}

// BMI berechnen
function calculateBMI(gewicht) {
    const groesseM = groesse / 100;
    return gewicht / (groesseM * groesseM);
}

// Gesunden Bereich als Plugin erstellen
function createHealthyRangePlugin(type) {
    if (!geschlecht || !healthRanges[type] || !healthRanges[type][geschlecht]) {
        return null;
    }
    
    const range = healthRanges[type][geschlecht];
    
    return {
        id: 'healthyRange',
        beforeDatasetsDraw(chart) {
            const { ctx, chartArea: { left, right }, scales: { y } } = chart;
            const yMin = y.getPixelForValue(range.min);
            const yMax = y.getPixelForValue(range.max);
            
            ctx.save();
            ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
            ctx.fillRect(left, yMax, right - left, yMin - yMax);
            ctx.restore();
        }
    };
}

// Charts aktualisieren
function updateCharts() {
    const data = getFilteredData();
    
    if (data.length === 0) {
        return;
    }
    
    const labels = data.map(m => {
        const d = new Date(m.datum);
        return d.getDate() + '.' + (d.getMonth() + 1) + '.';
    });
    
    // Labels für gesunde Bereiche anzeigen/verstecken
    ['muskel', 'fett', 'bmi'].forEach(type => {
        const label = document.getElementById(type + 'Label');
        if (label && geschlecht && healthRanges[type] && healthRanges[type][geschlecht]) {
            label.style.display = 'block';
        } else if (label) {
            label.style.display = 'none';
        }
    });
    
    // Chart-Konfiguration
    const chartConfig = (label, chartData, color, type) => {
        const plugin = createHealthyRangePlugin(type);
        
        return {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: chartData,
                    borderColor: color,
                    backgroundColor: color + '20',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: { font: { size: 11 } }
                    },
                    x: {
                        ticks: { font: { size: 10 } }
                    }
                }
            },
            plugins: plugin ? [plugin] : []
        };
    };
    
    // Alte Charts zerstören
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {};
    
    // Neue Charts erstellen
    charts.gewicht = new Chart(
        document.getElementById('chartGewicht'),
        chartConfig('Gewicht (kg)', data.map(m => m.gewicht), '#667eea', null)
    );
    
    charts.muskel = new Chart(
        document.getElementById('chartMuskel'),
        chartConfig('Muskelanteil (%)', data.map(m => m.muskelanteil), '#10b981', 'muskel')
    );
    
    charts.fett = new Chart(
        document.getElementById('chartFett'),
        chartConfig('Fettanteil (%)', data.map(m => m.fettanteil), '#ef4444', 'fett')
    );
    
    charts.bmi = new Chart(
        document.getElementById('chartBMI'),
        chartConfig('BMI', data.map(m => calculateBMI(m.gewicht)), '#f59e0b', 'bmi')
    );
}

// Datentabelle aktualisieren
function updateDataTable() {
    const container = document.getElementById('dataTableContainer');
    
    if (measurements.length === 0) {
        container.innerHTML = '<div class="no-data">Noch keine Daten vorhanden.<br>Gehe zur Eingabe und füge deine erste Messung hinzu!</div>';
        return;
    }
    
    const sorted = [...measurements].sort((a, b) => new Date(b.datum) - new Date(a.datum));
    
    let html = '<table class="data-table"><thead><tr><th>Datum</th><th>Gewicht</th><th>Muskel</th><th>Fett</th><th>BMI</th><th></th></tr></thead><tbody>';
    
    sorted.forEach((m) => {
        const bmi = calculateBMI(m.gewicht).toFixed(1);
        const measurementId = m.id || (m.datum + '_' + m.gewicht);
        html += `<tr>
            <td>${m.datum}</td>
            <td>${m.gewicht}</td>
            <td>${m.muskelanteil}%</td>
            <td>${m.fettanteil}%</td>
            <td>${bmi}</td>
            <td><button class="delete-btn" onclick="deleteMeasurement('${measurementId}')">Löschen</button></td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Einzelne Messung löschen
function deleteMeasurement(measurementId) {
    const index = measurements.findIndex(m => {
        const id = m.id || (m.datum + '_' + m.gewicht);
        return id == measurementId;
    });
    
    if (index !== -1) {
        measurements.splice(index, 1);
        saveData();
        updateDataTable();
        updateCharts();
    }
}

// Modal anzeigen
function showDeleteModal() {
    document.getElementById('deleteModal').classList.add('active');
}

// Modal verstecken
function hideDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
}

// Alle Daten löschen bestätigen
function confirmDeleteAllData() {
    measurements = [];
    saveData();
    updateDataTable();
    
    // Charts zerstören
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {};
    
    hideDeleteModal();
    alert('Alle Daten wurden gelöscht.');
}

// CSV Export
function exportCSV() {
    if (measurements.length === 0) {
        alert('Keine Daten zum Exportieren vorhanden!');
        return;
    }
    
    let csv = 'Datum,Gewicht,Muskelanteil,Fettanteil\n';
    measurements.forEach(m => {
        csv += `${m.datum},${m.gewicht},${m.muskelanteil},${m.fettanteil}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gesundheitsdaten_' + new Date().toISOString().split('T')[0] + '.csv';
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
        
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(',');
            if (parts.length >= 4) {
                const measurement = {
                    datum: parts[0],
                    gewicht: parseFloat(parts[1]),
                    muskelanteil: parseFloat(parts[2]),
                    fettanteil: parseFloat(parts[3]),
                    id: Date.now() + i
                };
                
                // Duplikate vermeiden
                const exists = measurements.some(m => 
                    m.datum === measurement.datum && m.gewicht === measurement.gewicht
                );
                
                if (!exists) {
                    measurements.push(measurement);
                    imported++;
                }
            }
        }
        
        saveData();
        updateDataTable();
        updateCharts();
        alert(`${imported} Einträge erfolgreich importiert!`);
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

// Bei Laden initialisieren
window.onload = init;