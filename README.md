# 🏃‍♂️ TrackApp – Gesundheit & Training PWA

Eine Progressive Web App (PWA) zum lokalen Erfassen von Körperwerten und täglichen Kraftübungen auf dem Smartphone. Entwickelt für die direkte Nutzung im Browser (z. B. via GitHub Pages) mit nativer App-Haptik auf dem Home-Bildschirm.

---

## ✨ Features

### ⚖️ Körperwerte & Gesundheit
- **Messwerte:** Erfassung von Gewicht (kg), optional Muskelanteil (%) und Fettanteil (%).
- **Automatische Berechnung:** Ermittlung des Body-Mass-Index (BMI) basierend auf deinen hinterlegten Einstellungen.
- **Verlaufsdiagramme:** Interaktive Verläufe über 7 Tage, 30 Tage, 3 Monate, 1 Jahr oder frei wählbare Zeiträume.
- **Referenzbereiche:** Visuelle Einordnung nach WHO-Standards für gesunde Richtwerte.

### 💪 Training & Übungserfassung (Neu)
- **Übungen:** Erfassung von Liegestützen und Kniebeugen.
- **Mehrere Einheiten pro Tag:** Mehrere Trainingsdurchgänge am selben Tag erfassbar; Wiederholungen werden tagesbasiert automatisch kumuliert.
- **Komfortable Eingabe:** Schnelle Mengenauswahl über Stepper-Buttons (±1 und ±5 Wiederholungen).
- **Rückwirkende Pflege:** Beliebiges Datum wählbar, um vergangene Trainingstage nachzutragen oder bestehende Einträge zu korrigieren.
- **Trainingsvisualisierung:** Eigene Verlaufsdiagramme für die tägliche Gesamtzahl absolvierter Wiederholungen.

### 💾 Datenmanagement & Privatsphäre
- **100 % lokal (Datenschutz):** Alle Daten verbleiben ausschließlich im `localStorage` deines Browsers. Es findet keine Übertragung an externe Server oder Clouds statt.
- **Getrennte Datenhaltung:** Trainingsdaten (`exercises`) und Messwerte (`measurements`) werden unabhängig voneinander verwaltet, sodass historische Gewichtsdaten unberührt bleiben.
- **CSV-Import & CSV-Export:** Getrennter Datenexport und -import im CSV-Format zur Datensicherung oder für Analysen in Tabellenkalkulationen.
- **Offline-Fähigkeit:** Dank Service Worker voll funktionsfähig ohne aktive Internetverbindung.

---

## 📱 Installation als App

### Auf dem iPhone (Safari)
1. Rufe deine GitHub-Pages-URL in **Safari** auf.
2. Tippe unten in der Menüleiste auf das **Teilen-Symbol** (Viereck mit Pfeil nach oben).
3. Scrolle im Menü nach unten und wähle **„Zum Home-Bildschirm“**.
4. Bestätige mit **„Hinzufügen“**. Die App startet danach im Vollbildmodus ohne Browserleisten.

### Auf Android (Chrome)
1. Öffne die URL in **Google Chrome**.
2. Tippe auf das Menü (Drei Punkte) oben rechts.
3. Wähle **„App installieren“** oder **„Zum Startbildschirm hinzufügen“**.

---

## 🚀 Deployment über GitHub Pages

1. **Dateien bereitstellen:** Lade alle Projektdateien in den Stammordner (`/`) deines GitHub-Repositories hoch.
2. **Pages aktivieren:**
   - Gehe im Repository auf **Settings** → **Pages**.
   - Wähle unter **Source** die Option *„Deploy from a branch“*.
   - Wähle als Branch `main` (oder `master`) und als Ordner `/ (root)`.
   - Klicke auf **Save**.
3. **Aufrufen:** Nach kurzer Bereitstellungszeit ist die App unter `https://<dein-nutzername>.github.io/<repository-name>/` erreichbar.

---

## 📁 Dateistruktur

```text
trackapp/
├── index.html        # Hauptansicht mit den Tabs: Gewicht, Training, Ergebnisse, Daten, Einstellungen
├── app.js            # Logik für Berechnungen, Diagramme, LocalStorage und CSV-Handling
├── sw.js             # Service Worker für Caching und Offline-Betrieb
├── manifest.json     # PWA-Manifest (App-Metadaten, Standalone-Modus, Icons)
├── README.md         # Projektdokumentation
├── icon-120.png      # App-Icon (120x120)
├── icon-152.png      # App-Icon (152x152)
├── icon-180.png      # App-Icon für iOS Apple Touch Icon (180x180)
├── icon-192.png      # PWA-Icon Android (192x192)
└── icon-512.png      # PWA-Icon hochauflösend (512x512)
