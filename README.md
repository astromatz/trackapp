🏃‍♂️ Gesundheitstracker PWA

Eine Progressive Web App zum Tracken deiner Gesundheitswerte: Gewicht, Muskelanteil, Fettanteil und BMI.

✨ Features

📊 Interaktive Charts - Visualisierung deiner Gesundheitsdaten über verschiedene Zeiträume

💚 WHO-Standards - Gesunde Bereiche werden in den Charts angezeigt

📱 Mobile-optimiert - Perfekt für iPhone und Android

💾 Offline-fähig - Funktioniert auch ohne Internetverbindung

📥 Import/Export - CSV-Datenexport und -import

🔒 Datenschutz - Alle Daten bleiben lokal auf deinem Gerät

🚀 Installation
GitHub Pages Deployment
Repository erstellen

Erstelle ein neues GitHub Repository

Lade alle Dateien hoch

GitHub Pages aktivieren

Gehe zu Settings → Pages

Wähle "Deploy from a branch"

Branch: main / Folder: / (root)

Speichern

Icons erstellen

Erstelle zwei App-Icons:

icon-192.png (192x192 Pixel)

icon-512.png (512x512 Pixel)

Lade sie ins Repository hoch

Fertig!
Deine App ist unter https://deinusername.github.io/repository-name/ erreichbar
Als PWA installieren

Auf dem iPhone:

Öffne die App in Safari

Tippe auf das Teilen-Symbol

Wähle "Zum Home-Bildschirm"

Auf Android:

Öffne die App in Chrome

Tippe auf die drei Punkte

Wähle "App installieren"

📁 Dateistruktur
gesundheitstracker/
├── index.html          # Haupt-HTML-Datei
├── app.js             # JavaScript-Logik
├── sw.js              # Service Worker für Offline-Funktionalität
├── manifest.json      # PWA-Manifest
├── icon-192.png       # App-Icon (192x192)
├── icon-512.png       # App-Icon (512x512)
└── README.md          # Diese Datei

🛠️ Technologien

HTML5 - Struktur

CSS3 - Styling mit Gradients und Flexbox

JavaScript (ES6+) - Logik

Chart.js - Datenvisualisierung

Service Worker - Offline-Funktionalität

LocalStorage - Datenspeicherung

📊 Verwendung

Eingabe - Gib deine täglichen Werte ein

Ergebnisse - Betrachte deine Fortschritte in Charts

Daten - Verwalte deine historischen Daten

Einstellungen - Konfiguriere Geschlecht und Körpergröße

🔐 Datenschutz

Alle Daten werden ausschließlich lokal im Browser gespeichert (LocalStorage). Es werden keine Daten an externe Server übertragen.

📝 Lizenz

MIT License - Frei verwendbar für private und kommerzielle Zwecke.

🤝 Beitragen

Pull Requests sind willkommen! Für größere Änderungen öffne bitte zuerst ein Issue.

Entwickelt mit ❤️ für deine Gesundheit