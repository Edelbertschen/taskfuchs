# TaskFuchs Website - Development Setup

## 🚫 No-Cache Development Server

Für die Entwicklung der TaskFuchs-Website verwenden wir einen speziellen Python-Server, der **No-Cache Headers** setzt. Dies stellt sicher, dass Änderungen an HTML, CSS oder JavaScript-Dateien sofort beim Neuladen der Seite sichtbar werden.

## 🚀 Server starten

### Option 1: Start-Script verwenden
```bash
cd website
./start.sh
```

### Option 2: Direkt Python-Server starten
```bash
cd website
python3 dev-server.py
```

## 🌐 URLs

- **Hauptseite:** http://localhost:8000
- **No-Cache Test:** http://localhost:8000/test-no-cache.html

## 🔧 Features des Development Servers

### ✅ No-Cache Headers
Der Server setzt automatisch die folgenden HTTP-Headers:

```http
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
Last-Modified: [aktuelle Zeit]
```

### 🎯 Vorteile

1. **Sofortige Sichtbarkeit:** Änderungen werden beim Neuladen sofort angezeigt
2. **Kein Browser-Cache:** Keine veralteten Dateien aus dem Browser-Cache
3. **Entwicklerfreundlich:** Keine manuellen Cache-Löschungen nötig
4. **Live-Debugging:** Änderungen können direkt getestet werden

### 🧪 No-Cache testen

1. Besuche: http://localhost:8000/test-no-cache.html
2. Bearbeite eine beliebige Website-Datei
3. Speichere die Änderungen
4. Lade die Seite neu (F5 oder Cmd+R)
5. **Änderungen sind sofort sichtbar!** ✨

## 📁 Dateistruktur

```
website/
├── dev-server.py          # No-Cache Development Server
├── start.sh              # Start-Script für den Server
├── test-no-cache.html    # Test-Seite für No-Cache
├── index.html            # Hauptseite
├── images/               # Screenshots und Assets
└── README-DEVELOPMENT.md # Diese Datei
```

## ⚡ Troubleshooting

### Port bereits belegt
Falls Port 8000 bereits verwendet wird:

```bash
# Alle Prozesse auf Port 8000 beenden
lsof -ti:8000 | xargs kill -9

# Server neu starten
python3 dev-server.py
```

### Python nicht gefunden
Stelle sicher, dass Python 3 installiert ist:

```bash
python3 --version
```

### Browser-Cache trotzdem aktiv
1. Öffne die Entwicklertools (F12)
2. Rechtsklick auf "Neu laden" → "Cache leeren und neu laden"
3. Oder verwende den Inkognito-Modus

## 🦊 Happy Coding!

Der No-Cache Development Server macht die Entwicklung viel effizienter. Änderungen werden sofort sichtbar und du kannst dich auf das Wesentliche konzentrieren! 🎉 