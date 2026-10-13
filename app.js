// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js')
            .then(function() { console.log('Service Worker registriert'); })
            .catch(function(err) { console.log('Service Worker Fehler:', err); });
    });
}

// PWA Install Prompt
var deferredPrompt;
var installPrompt = document.getElementById('installPrompt');

window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (!localStorage.getItem('installDismissed')) {
        installPrompt.classList.add('show');
    }
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choiceResult) {
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

// ==========================================
// Daten-Management
// ==========================================
var measurements = JSON.parse(localStorage.getItem('measurements') || '[]');
var exercises = JSON.parse(localStorage.getItem('exercises') || '[]');
var settings = JSON.parse(localStorage.getItem('settings') || '{"geschlecht":"","groesse":""}');

// Aktueller Trainings-Tab State
var currentExerciseType = 'liegestuetze';

// ==========================================
// Initialisierung
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // Setze heutiges Datum für Gewichts-Tab
    var dateInput = document.getElementById('datum');
    if (dateInput) dateInput.valueAsDate = new Date();

    // Setze heutiges Datum für Training-Tab
    var trainingDateInput = document.getElementById('trainingDatum');
    if (trainingDateInput) trainingDateInput.valueAsDate = new Date();

    // Lade Einstellungen
    var geschlechtEl = document.getElementById('geschlecht');
    var groesseEl = document.getElementById('groesse');
    if (geschlechtEl) geschlechtEl.value = settings.geschlecht || '';
    if (groesseEl) groesseEl.value = settings.groesse || '';

    // Initialisiere Charts/Tabellen
    updateCharts();
    updateDataTable();
    updateExerciseDataTable();
    updateDaySummary();

    // Reagiere auf Datumswechsel im Training-Tab
    if (trainingDateInput) {
        trainingDateInput.addEventListener('change', function() {
            updateDaySummary();
        });
    }
});

// ==========================================
// Tab-Wechsel
// ==========================================
function switchTab(tabName, ev) {
    var evt = ev || (typeof event !== 'undefined' ? event : null);
    document.querySelectorAll('.tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(content) { content.classList.remove('active'); });

    if (evt && evt.target) {
        evt.target.classList.add('active');
    }
    var tabEl = document.getElementById(tabName);
    if (tabEl) tabEl.classList.add('active');

    if (tabName === 'ergebnisse') updateCharts();
    if (tabName === 'daten') {
        updateDataTable();
        updateExerciseDataTable();
    }
    if (tabName === 'training') updateDaySummary();
}

// ==========================================
// Hilfsfunktionen
// ==========================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateString) {
    var date = new Date(dateString);
    var day = date.getDate();
    var month = date.getMonth() + 1;
    return day + '.' + month;
}

function formatDateFull(dateString) {
    var date = new Date(dateString);
    var day = String(date.getDate()).padStart(2, '0');
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var year = date.getFullYear();
    return day + '.' + month + '.' + year;
}

function formatTime(isoString) {
    if (!isoString) return '';
    var d = new Date(isoString);
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
}

function getLastValidValue(field, beforeDate) {
    if (measurements.length === 0) return null;
    var targetDate = new Date(beforeDate);
    var sorted = measurements.slice().filter(function(m) { return new Date(m.datum) < targetDate; })
        .sort(function(a, b) { return new Date(b.datum) - new Date(a.datum); });
    for (var i = 0; i < sorted.length; i++) {
        var value = sorted[i][field];
        if (value !== null && value !== undefined && typeof value === 'number' && !isNaN(value) && value > 0) {
            return value;
        }
    }
    return null;
}

// ==========================================
// GEWICHT: Messung speichern (unveränderte Logik)
// ==========================================
function saveMeasurement() {
    var datum = document.getElementById('datum').value;
    var gewicht = parseFloat(document.getElementById('gewicht-input').value);
    var muskelanteilInput = document.getElementById('muskelanteil').value;
    var fettanteilInput = document.getElementById('fettanteil').value;

    if (!datum || !gewicht || isNaN(gewicht)) {
        alert('Bitte gib mindestens Datum und Gewicht ein!');
        return;
    }

    if (!settings.groesse) {
        alert('Bitte gib zuerst deine Körpergröße in den Einstellungen an!');
        switchTab('einstellungen');
        return;
    }

    var muskelanteil = null;
    var fettanteil = null;

    if (muskelanteilInput !== '' && !isNaN(parseFloat(muskelanteilInput))) {
        muskelanteil = parseFloat(muskelanteilInput);
    }
    if (fettanteilInput !== '' && !isNaN(parseFloat(fettanteilInput))) {
        fettanteil = parseFloat(fettanteilInput);
    }

    var groesseM = settings.groesse / 100;
    var bmi = gewicht / (groesseM * groesseM);

    var existingIndex = measurements.findIndex(function(m) { return m.datum === datum; });

    var measurement = {
        datum: datum,
        gewicht: gewicht,
        muskelanteil: muskelanteil,
        fettanteil: fettanteil,
        bmi: parseFloat(bmi.toFixed(1))
    };

    if (existingIndex >= 0) {
        measurements[existingIndex] = measurement;
    } else {
        measurements.push(measurement);
    }

    measurements.sort(function(a, b) { return new Date(a.datum) - new Date(b.datum); });
    localStorage.setItem('measurements', JSON.stringify(measurements));

    document.getElementById('gewicht-input').value = '';
    document.getElementById('muskelanteil').value = '';
    document.getElementById('fettanteil').value = '';

    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('datum').valueAsDate = tomorrow;

    alert('Messung gespeichert!');
    updateCharts();
    updateDataTable();
}

// ==========================================
// TRAINING: Übung speichern
// ==========================================
function setExerciseType(typ) {
    currentExerciseType = typ;
    var btnL = document.getElementById('toggleLiegestuetze');
    var btnK = document.getElementById('toggleKniebeugen');
    if (btnL) btnL.classList.toggle('active', typ === 'liegestuetze');
    if (btnK) btnK.classList.toggle('active', typ === 'kniebeugen');
}

function stepReps(amount) {
    var input = document.getElementById('repsInput');
    if (!input) return;
    var current = parseInt(input.value) || 0;
    var newVal = Math.max(0, current + amount);
    input.value = newVal;
}

function saveExercise() {
    var datum = document.getElementById('trainingDatum').value;
    var reps = parseInt(document.getElementById('repsInput').value);

    if (!datum) {
        alert('Bitte wähle ein Datum!');
        return;
    }
    if (!reps || reps <= 0) {
        alert('Bitte gib eine gültige Wiederholungszahl ein!');
        return;
    }

    var exercise = {
        id: generateId(),
        datum: datum,
        typ: currentExerciseType,
        wiederholungen: reps,
        zeitstempel: new Date().toISOString()
    };

    exercises.push(exercise);
    exercises.sort(function(a, b) { return new Date(b.zeitstempel) - new Date(a.zeitstempel); });
    localStorage.setItem('exercises', JSON.stringify(exercises));

    // Reset input
    document.getElementById('repsInput').value = '10';

    updateDaySummary();
    alert('Einheit gespeichert!');
}

function deleteExercise(id) {
    if (confirm('Einheit löschen?')) {
        exercises = exercises.filter(function(e) { return e.id !== id; });
        localStorage.setItem('exercises', JSON.stringify(exercises));
        updateDaySummary();
        updateExerciseDataTable();
        updateCharts();
    }
}

function updateDaySummary() {
    var datumEl = document.getElementById('trainingDatum');
    if (!datumEl) return;
    var datum = datumEl.value;
    if (!datum) return;

    var dayExercises = exercises.filter(function(e) { return e.datum === datum; });

    // Kumulierte Summen
    var totalLiegestuetze = 0;
    var totalKniebeugen = 0;
    dayExercises.forEach(function(e) {
        if (e.typ === 'liegestuetze') totalLiegestuetze += (e.wiederholungen || 0);
        if (e.typ === 'kniebeugen') totalKniebeugen += (e.wiederholungen || 0);
    });

    var totalsEl = document.getElementById('dayTotals');
    if (totalsEl) {
        totalsEl.innerHTML =
            '<div class="day-total-card">' +
                '<div class="day-total-icon">💪</div>' +
                '<div class="day-total-value">' + totalLiegestuetze + '</div>' +
                '<div class="day-total-label">Liegestütze</div>' +
            '</div>' +
            '<div class="day-total-card">' +
                '<div class="day-total-icon">🦵</div>' +
                '<div class="day-total-value">' + totalKniebeugen + '</div>' +
                '<div class="day-total-label">Kniebeugen</div>' +
            '</div>';
    }

    // Session-Liste (neueste zuerst)
    var sorted = dayExercises.slice().sort(function(a, b) {
        return new Date(b.zeitstempel) - new Date(a.zeitstempel);
    });

    var listEl = document.getElementById('sessionList');
    if (!listEl) return;

    if (sorted.length === 0) {
        listEl.innerHTML = '<div class="no-data" style="padding: 15px;">Noch keine Einheiten für diesen Tag</div>';
        return;
    }

    var html = '';
    sorted.forEach(function(e) {
        var icon = e.typ === 'liegestuetze' ? '💪' : '🦵';
        var label = e.typ === 'liegestuetze' ? 'Liegestütze' : 'Kniebeugen';
        html += '<div class="session-item">' +
            '<div class="session-info">' +
                '<span class="session-type-icon">' + icon + '</span>' +
                '<div class="session-details">' +
                    '<div class="reps">' + e.wiederholungen + ' ' + label + '</div>' +
                    '<div class="time">' + formatTime(e.zeitstempel) + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="session-actions">' +
                '<button class="edit-btn" onclick="editExercise(\'' + e.id + '\')" >✏️</button>' +
                '<button class="delete-btn" onclick="deleteExercise(\'' + e.id + '\')" >🗑️</button>' +
            '</div>' +
        '</div>';
    });
    listEl.innerHTML = html;
}

// ==========================================
// TRAINING: Bearbeiten
// ==========================================
var editingExerciseId = null;

function editExercise(id) {
    var ex = exercises.find(function(e) { return e.id === id; });
    if (!ex) return;

    editingExerciseId = id;
    document.getElementById('editExDatum').value = ex.datum;
    document.getElementById('editExTyp').value = ex.typ;
    document.getElementById('editExReps').value = ex.wiederholungen;
    document.getElementById('editExerciseModal').classList.add('active');
}

function hideEditExerciseModal() {
    document.getElementById('editExerciseModal').classList.remove('active');
    editingExerciseId = null;
}

function saveEditedExercise() {
    var datum = document.getElementById('editExDatum').value;
    var typ = document.getElementById('editExTyp').value;
    var reps = parseInt(document.getElementById('editExReps').value);

    if (!datum || !typ || !reps || reps <= 0) {
        alert('Bitte fülle alle Felder korrekt aus!');
        return;
    }

    var index = exercises.findIndex(function(e) { return e.id === editingExerciseId; });
    if (index === -1) {
        alert('Fehler: Einheit nicht gefunden!');
        return;
    }

    exercises[index].datum = datum;
    exercises[index].typ = typ;
    exercises[index].wiederholungen = reps;
    localStorage.setItem('exercises', JSON.stringify(exercises));

    hideEditExerciseModal();
    alert('Einheit aktualisiert!');
    updateDaySummary();
    updateExerciseDataTable();
    updateCharts();
}

// ==========================================
// Einstellungen
// ==========================================
function saveSettings() {
    var geschlecht = document.getElementById('geschlecht').value;
    var groesse = parseFloat(document.getElementById('groesse').value);

    if (!geschlecht || !groesse) {
        alert('Bitte fülle alle Felder aus!');
        return;
    }

    settings = { geschlecht: geschlecht, groesse: groesse };
    localStorage.setItem('settings', JSON.stringify(settings));

    measurements = measurements.map(function(m) {
        var groesseM = groesse / 100;
        var bmi = m.gewicht / (groesseM * groesseM);
        return Object.assign({}, m, { bmi: parseFloat(bmi.toFixed(1)) });
    });

    localStorage.setItem('measurements', JSON.stringify(measurements));
    alert('Einstellungen gespeichert!');
    updateCharts();
    updateDataTable();
}

// ==========================================
// Zeitraum-Verwaltung
// ==========================================
var currentTimeRange = 7;
var customRangeActive = false;

function setTimeRange(days, ev) {
    currentTimeRange = days;
    customRangeActive = false;
    document.querySelectorAll('.time-btn').forEach(function(btn) { btn.classList.remove('active'); });
    var evt = ev || (typeof event !== 'undefined' ? event : null);
    if (evt && evt.target) evt.target.classList.add('active');
    var cr = document.getElementById('customRange');
    if (cr) cr.classList.remove('active');
    updateCharts();
}

function toggleCustomRange() {
    var customRange = document.getElementById('customRange');
    var customBtn = document.getElementById('customBtn');

    if (customRange.classList.contains('active')) {
        customRange.classList.remove('active');
        customBtn.classList.remove('active');
        customRangeActive = false;
    } else {
        customRange.classList.add('active');
        customBtn.classList.add('active');
        var today = new Date();
        var monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        document.getElementById('dateTo').valueAsDate = today;
        document.getElementById('dateFrom').valueAsDate = monthAgo;
    }
}

function applyCustomRange() {
    var dateFrom = document.getElementById('dateFrom').value;
    var dateTo = document.getElementById('dateTo').value;
    if (!dateFrom || !dateTo) { alert('Bitte wähle beide Daten aus!'); return; }
    if (new Date(dateFrom) > new Date(dateTo)) { alert('Das Start-Datum muss vor dem End-Datum liegen!'); return; }
    customRangeActive = true;
    document.querySelectorAll('.time-btn').forEach(function(btn) {
        if (btn.id !== 'customBtn') btn.classList.remove('active');
    });
    updateCharts();
}

// ==========================================
// Datenfilter
// ==========================================
function getDateRange() {
    var startDate, endDate;
    if (customRangeActive) {
        startDate = new Date(document.getElementById('dateFrom').value);
        endDate = new Date(document.getElementById('dateTo').value);
        endDate.setHours(23, 59, 59, 999);
    } else {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - currentTimeRange);
        startDate.setHours(0, 0, 0, 0);
    }
    return { start: startDate, end: endDate };
}

function getFilteredData() {
    if (measurements.length === 0) return [];
    var range = getDateRange();
    var filtered = measurements.filter(function(m) {
        var mDate = new Date(m.datum);
        return mDate >= range.start && mDate <= range.end;
    });
    return filtered.sort(function(a, b) { return new Date(a.datum) - new Date(b.datum); });
}

function getFilteredExercises() {
    if (exercises.length === 0) return [];
    var range = getDateRange();
    return exercises.filter(function(e) {
        var eDate = new Date(e.datum);
        return eDate >= range.start && eDate <= range.end;
    });
}

// Aggregiere Trainings pro Tag und Typ
function aggregateExercises(typ) {
    var filtered = getFilteredExercises().filter(function(e) { return e.typ === typ; });
    var dayMap = {};
    filtered.forEach(function(e) {
        if (!dayMap[e.datum]) dayMap[e.datum] = 0;
        dayMap[e.datum] += (e.wiederholungen || 0);
    });

    // Sortiert nach Datum
    var dates = Object.keys(dayMap).sort(function(a, b) { return new Date(a) - new Date(b); });
    return {
        labels: dates.map(function(d) { return formatDate(d); }),
        values: dates.map(function(d) { return dayMap[d]; })
    };
}

// ==========================================
// Charts
// ==========================================
var chartGewicht, chartMuskel, chartFett, chartBMI, chartLiegestuetze, chartKniebeugen;

function updateCharts() {
    var data = getFilteredData();

    if (data.length === 0) {
        ['chartGewicht', 'chartMuskel', 'chartFett', 'chartBMI'].forEach(function(id) {
            var canvas = document.getElementById(id);
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Keine Daten verfügbar', canvas.width / 2, canvas.height / 2);
        });
    } else {
        var labels = data.map(function(m) { return formatDate(m.datum); });
        var gewichtData = data.map(function(m) { return m.gewicht; });
        var bmiData = data.map(function(m) { return m.bmi; });

        function forwardFillAfterFirstValue(series) {
            var last = null;
            return series.map(function(v) {
                var val = (typeof v === 'number' && !Number.isNaN(v)) ? v : null;
                if (val === null) {
                    return last === null ? null : last;
                } else {
                    last = val;
                    return val;
                }
            });
        }

        var muskelRaw = data.map(function(m) { return (typeof m.muskelanteil === 'number' && !Number.isNaN(m.muskelanteil)) ? m.muskelanteil : null; });
        var fettRaw = data.map(function(m) { return (typeof m.fettanteil === 'number' && !Number.isNaN(m.fettanteil)) ? m.fettanteil : null; });
        var muskelDataFF = forwardFillAfterFirstValue(muskelRaw);
        var fettDataFF = forwardFillAfterFirstValue(fettRaw);

        function trimLeadingNulls(labelsArr) {
            var seriesArr = Array.prototype.slice.call(arguments, 1);
            var firstIndex = 0;
            var n = labelsArr.length;
            for (; firstIndex < n; firstIndex++) {
                var found = false;
                for (var si = 0; si < seriesArr.length; si++) {
                    if (seriesArr[si][firstIndex] != null) { found = true; break; }
                }
                if (found) break;
            }
            return {
                labels: labelsArr.slice(firstIndex),
                series: seriesArr.map(function(s) { return s.slice(firstIndex); })
            };
        }

        var trimmedMuskelFett = trimLeadingNulls(labels, muskelDataFF, fettDataFF);

        updateLineChart('chartGewicht', 'chartGewichtRef', labels, gewichtData, 'Gewicht (kg)', '#3b82f6', null);

        var muskelRange = getHealthyMuscleRange();
        updateLineChart('chartMuskel', 'chartMuskelRef', trimmedMuskelFett.labels, trimmedMuskelFett.series[0], 'Muskelanteil (%)', '#10b981', muskelRange);
        var muskelLabelEl = document.getElementById('muskelLabel');
        if (muskelLabelEl) muskelLabelEl.style.display = muskelRange ? 'block' : 'none';

        var fettRange = getHealthyFatRange();
        updateLineChart('chartFett', 'chartFettRef', trimmedMuskelFett.labels, trimmedMuskelFett.series[1], 'Fettanteil (%)', '#f59e0b', fettRange);
        var fettLabelEl = document.getElementById('fettLabel');
        if (fettLabelEl) fettLabelEl.style.display = fettRange ? 'block' : 'none';

        var bmiRange = { min: 18.5, max: 24.9 };
        updateLineChart('chartBMI', 'chartBMIRef', labels, bmiData, 'BMI', '#8b5cf6', bmiRange);
        var bmiLabelEl = document.getElementById('bmiLabel');
        if (bmiLabelEl) bmiLabelEl.style.display = 'block';
    }

    // Trainings-Charts
    updateExerciseCharts();
}

function updateLineChart(canvasId, refKey, labels, data, label, color, healthyRange) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    // Destroy existing
    if (window[refKey]) window[refKey].destroy();

    var datasets = [{
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

    window[refKey] = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) return label + ': ' + context.parsed.y.toFixed(1);
                            return null;
                        }
                    },
                    filter: function(tooltipItem) { return tooltipItem.datasetIndex === 0; }
                }
            },
            scales: {
                y: { beginAtZero: false, ticks: { font: { size: 10 } } },
                x: { ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 45 } }
            }
        }
    });
}

function updateExerciseCharts() {
    var liegestuetzeData = aggregateExercises('liegestuetze');
    var kniebeugenData = aggregateExercises('kniebeugen');

    updateBarChart('chartLiegestuetze', 'chartLiegestuetzeRef', liegestuetzeData.labels, liegestuetzeData.values, 'Liegestütze', '#667eea');
    updateBarChart('chartKniebeugen', 'chartKniebeugenRef', kniebeugenData.labels, kniebeugenData.values, 'Kniebeugen', '#764ba2');
}

function updateBarChart(canvasId, refKey, labels, data, label, color) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    if (window[refKey]) window[refKey].destroy();

    if (labels.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('Keine Trainingsdaten', canvas.width / 2, canvas.height / 2);
        return;
    }

    window[refKey] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: color + 'cc',
                borderColor: color,
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) { return context.parsed.y + ' Wdh.'; }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 5 } },
                x: { ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 45 } }
            }
        }
    });
}

function getHealthyMuscleRange() {
    if (!settings.geschlecht) return null;
    return settings.geschlecht === 'mann' ? { min: 33, max: 39 } : { min: 28, max: 34 };
}

function getHealthyFatRange() {
    if (!settings.geschlecht) return null;
    return settings.geschlecht === 'mann' ? { min: 10, max: 20 } : { min: 18, max: 28 };
}

// ==========================================
// Daten-Tabelle (Gewicht)
// ==========================================
function updateDataTable() {
    var container = document.getElementById('dataTableContainer');
    if (!container) return;

    if (measurements.length === 0) {
        container.innerHTML = '<div class="no-data">Noch keine Gewichtsdaten vorhanden</div>';
        return;
    }

    var sortedData = measurements.slice().sort(function(a, b) { return new Date(b.datum) - new Date(a.datum); });

    var html = '<table class="data-table"><thead><tr>' +
        '<th>Datum</th><th>Gewicht</th><th>Muskel</th><th>Fett</th><th>BMI</th><th>Aktion</th>' +
        '</tr></thead><tbody>';

    sortedData.forEach(function(m) {
        var muskelStr = (m.muskelanteil !== null && m.muskelanteil !== undefined && !isNaN(m.muskelanteil)) ? m.muskelanteil.toFixed(1) + '%' : '-';
        var fettStr = (m.fettanteil !== null && m.fettanteil !== undefined && !isNaN(m.fettanteil)) ? m.fettanteil.toFixed(1) + '%' : '-';
        html += '<tr>' +
            '<td>' + formatDateFull(m.datum) + '</td>' +
            '<td>' + m.gewicht.toFixed(1) + ' kg</td>' +
            '<td>' + muskelStr + '</td>' +
            '<td>' + fettStr + '</td>' +
            '<td>' + m.bmi.toFixed(1) + '</td>' +
            '<td>' +
                '<button class="edit-btn" onclick="editMeasurement(\'' + m.datum + '\')" >✏️</button>' +
                '<button class="delete-btn" onclick="deleteMeasurement(\'' + m.datum + '\')" >🗑️</button>' +
            '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function deleteMeasurement(datum) {
    if (confirm('Möchtest du diese Messung wirklich löschen?')) {
        measurements = measurements.filter(function(m) { return m.datum !== datum; });
        localStorage.setItem('measurements', JSON.stringify(measurements));
        updateDataTable();
        updateCharts();
    }
}

// ==========================================
// Daten-Tabelle (Training)
// ==========================================
function updateExerciseDataTable() {
    var container = document.getElementById('exerciseTableContainer');
    if (!container) return;

    if (exercises.length === 0) {
        container.innerHTML = '<div class="no-data">Noch keine Trainingsdaten vorhanden</div>';
        return;
    }

    var sorted = exercises.slice().sort(function(a, b) {
        var dateCompare = new Date(b.datum) - new Date(a.datum);
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.zeitstempel) - new Date(a.zeitstempel);
    });

    var html = '<table class="data-table"><thead><tr>' +
        '<th>Datum</th><th>Übung</th><th>Wdh.</th><th>Uhrzeit</th><th>Aktion</th>' +
        '</tr></thead><tbody>';

    sorted.forEach(function(e) {
        var typLabel = e.typ === 'liegestuetze' ? '💪 Liegst.' : '🦵 Knieb.';
        html += '<tr>' +
            '<td>' + formatDateFull(e.datum) + '</td>' +
            '<td>' + typLabel + '</td>' +
            '<td>' + e.wiederholungen + '</td>' +
            '<td>' + formatTime(e.zeitstempel) + '</td>' +
            '<td>' +
                '<button class="edit-btn" onclick="editExercise(\'' + e.id + '\')" >✏️</button>' +
                '<button class="delete-btn" onclick="deleteExercise(\'' + e.id + '\')" >🗑️</button>' +
            '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ==========================================
// Edit Measurement Modal
// ==========================================
var editingDate = null;

function editMeasurement(datum) {
    var measurement = measurements.find(function(m) { return m.datum === datum; });
    if (!measurement) return;

    editingDate = datum;
    document.getElementById('editDatum').value = measurement.datum;
    document.getElementById('editGewicht').value = measurement.gewicht;
    document.getElementById('editMuskelanteil').value = (measurement.muskelanteil !== null && measurement.muskelanteil !== undefined) ? measurement.muskelanteil : '';
    document.getElementById('editFettanteil').value = (measurement.fettanteil !== null && measurement.fettanteil !== undefined) ? measurement.fettanteil : '';
    document.getElementById('editModal').classList.add('active');
}

function hideEditModal() {
    document.getElementById('editModal').classList.remove('active');
    editingDate = null;
}

function saveEditedMeasurement() {
    var datum = document.getElementById('editDatum').value;
    var gewicht = parseFloat(document.getElementById('editGewicht').value);
    var muskelanteilInput = document.getElementById('editMuskelanteil').value;
    var fettanteilInput = document.getElementById('editFettanteil').value;

    if (!datum || !gewicht || isNaN(gewicht)) {
        alert('Bitte gib mindestens Datum und Gewicht ein!');
        return;
    }

    if (!settings.groesse) {
        alert('Bitte gib zuerst deine Körpergröße in den Einstellungen an!');
        return;
    }

    var groesseM = settings.groesse / 100;
    var bmi = gewicht / (groesseM * groesseM);

    var index = measurements.findIndex(function(m) { return m.datum === editingDate; });
    if (index === -1) { alert('Fehler: Messung nicht gefunden!'); return; }

    if (datum !== editingDate) {
        var duplicateIndex = measurements.findIndex(function(m, i) { return m.datum === datum && i !== index; });
        if (duplicateIndex >= 0) { alert('Für dieses Datum existiert bereits eine Messung!'); return; }
    }

    var muskelanteil = null;
    var fettanteil = null;
    if (muskelanteilInput !== '' && !isNaN(parseFloat(muskelanteilInput))) muskelanteil = parseFloat(muskelanteilInput);
    if (fettanteilInput !== '' && !isNaN(parseFloat(fettanteilInput))) fettanteil = parseFloat(fettanteilInput);

    measurements[index] = {
        datum: datum,
        gewicht: gewicht,
        muskelanteil: muskelanteil,
        fettanteil: fettanteil,
        bmi: parseFloat(bmi.toFixed(1))
    };

    measurements.sort(function(a, b) { return new Date(a.datum) - new Date(b.datum); });
    localStorage.setItem('measurements', JSON.stringify(measurements));

    hideEditModal();
    alert('Messung aktualisiert!');
    updateCharts();
    updateDataTable();
}

// ==========================================
// Alle Daten löschen
// ==========================================
function showDeleteModal() {
    document.getElementById('deleteModal').classList.add('active');
}

function hideDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
}

function confirmDeleteAllData() {
    measurements = [];
    exercises = [];
    localStorage.setItem('measurements', JSON.stringify(measurements));
    localStorage.setItem('exercises', JSON.stringify(exercises));
    hideDeleteModal();
    updateDataTable();
    updateExerciseDataTable();
    updateCharts();
    updateDaySummary();
    alert('Alle Daten wurden gelöscht!');
}

// ==========================================
// CSV Export/Import (Gewicht)
// ==========================================
function exportCSV() {
    if (measurements.length === 0) {
        alert('Keine Gewichtsdaten zum Exportieren vorhanden!');
        return;
    }

    var csv = 'Datum,Gewicht (kg),Muskelanteil (%),Fettanteil (%),BMI\n';
    measurements.forEach(function(m) {
        csv += m.datum + ',' + m.gewicht + ',' + (m.muskelanteil !== null ? m.muskelanteil : '') + ',' + (m.fettanteil !== null ? m.fettanteil : '') + ',' + m.bmi + '\n';
    });

    var blob = new Blob([csv], { type: 'text/csv' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'gewichtsdaten_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function importCSV(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
        var text = e.target.result;
        var lines = text.split('\n');

        for (var i = 1; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;

            var parts = line.split(',');
            var datum = parts[0];
            var gewicht = parts[1];
            var muskelanteil = parts[2];
            var fettanteil = parts[3];
            var bmi = parts[4];

            if (datum && gewicht) {
                var parsedMuskel = parseFloat(muskelanteil);
                var parsedFett = parseFloat(fettanteil);
                var parsedBMI = parseFloat(bmi);

                if (!muskelanteil || muskelanteil.trim() === '' || isNaN(parsedMuskel)) {
                    parsedMuskel = getLastValidValue('muskelanteil', datum);
                }
                if (!fettanteil || fettanteil.trim() === '' || isNaN(parsedFett)) {
                    parsedFett = getLastValidValue('fettanteil', datum);
                }
                if (!bmi || bmi.trim() === '' || isNaN(parsedBMI)) {
                    if (settings.groesse) {
                        var groesseM = settings.groesse / 100;
                        parsedBMI = parseFloat(gewicht) / (groesseM * groesseM);
                        parsedBMI = parseFloat(parsedBMI.toFixed(1));
                    } else {
                        parsedBMI = 0;
                    }
                }

                var measurement = {
                    datum: datum,
                    gewicht: parseFloat(gewicht),
                    muskelanteil: parsedMuskel,
                    fettanteil: parsedFett,
                    bmi: parsedBMI
                };

                var existingIndex = measurements.findIndex(function(m) { return m.datum === datum; });
                if (existingIndex >= 0) {
                    measurements[existingIndex] = measurement;
                } else {
                    measurements.push(measurement);
                }
            }
        }

        measurements.sort(function(a, b) { return new Date(a.datum) - new Date(b.datum); });
        localStorage.setItem('measurements', JSON.stringify(measurements));
        updateDataTable();
        updateCharts();
        alert('Gewichtsdaten erfolgreich importiert!');
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==========================================
// CSV Export/Import (Training)
// ==========================================
function exportExerciseCSV() {
    if (exercises.length === 0) {
        alert('Keine Trainingsdaten zum Exportieren vorhanden!');
        return;
    }

    var csv = 'ID,Datum,Typ,Wiederholungen,Zeitstempel\n';
    exercises.forEach(function(e) {
        csv += e.id + ',' + e.datum + ',' + e.typ + ',' + e.wiederholungen + ',' + (e.zeitstempel || '') + '\n';
    });

    var blob = new Blob([csv], { type: 'text/csv' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'trainingsdaten_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function importExerciseCSV(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
        var text = e.target.result;
        var lines = text.split('\n');

        for (var i = 1; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;

            var parts = line.split(',');
            var id = parts[0];
            var datum = parts[1];
            var typ = parts[2];
            var wiederholungen = parseInt(parts[3]);
            var zeitstempel = parts[4] || new Date().toISOString();

            if (datum && typ && wiederholungen > 0) {
                if (typ !== 'liegestuetze' && typ !== 'kniebeugen') continue;

                var existingIndex = exercises.findIndex(function(ex) { return ex.id === id; });
                var exercise = {
                    id: id || generateId(),
                    datum: datum,
                    typ: typ,
                    wiederholungen: wiederholungen,
                    zeitstempel: zeitstempel
                };

                if (existingIndex >= 0) {
                    exercises[existingIndex] = exercise;
                } else {
                    exercises.push(exercise);
                }
            }
        }

        localStorage.setItem('exercises', JSON.stringify(exercises));
        updateExerciseDataTable();
        updateDaySummary();
        updateCharts();
        alert('Trainingsdaten erfolgreich importiert!');
    };
    reader.readAsText(file);
    event.target.value = '';
}
