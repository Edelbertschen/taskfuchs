# TaskFuchs Desktop-App

TaskFuchs ist jetzt auch als Desktop-Anwendung verfügbar! Die Desktop-App basiert auf Electron und bietet alle Funktionen der Web-Version in einer nativen Desktop-Umgebung.

## 🚀 Entwicklung

### Voraussetzungen
- Node.js (v16 oder höher)
- npm oder yarn

### Development starten
```bash
# Alle Dependencies installieren
npm install

# Desktop-App im Entwicklungsmodus starten
npm run electron-dev
```

Dieser Befehl startet sowohl den Vite Development Server als auch die Electron-App. Die App lädt automatisch die lokale Entwicklungsversion.

### Nur Electron starten (wenn Vite bereits läuft)
```bash
npm run electron
```

## 📦 Build und Distribution

### Desktop-App bauen
```bash
# Produktions-Build erstellen
npm run dist
```

Das erstellt installierbare Dateien im `dist-electron` Ordner:
- **macOS**: `.dmg` Datei
- **Windows**: `.exe` Installer
- **Linux**: `.AppImage` und `.deb` Dateien

### Verschiedene Plattformen
```bash
# Nur für macOS
npm run dist -- --mac

# Nur für Windows
npm run dist -- --win

# Nur für Linux
npm run dist -- --linux
```

## ✨ Features der Desktop-App

### Natives Desktop-Erlebnis
- **Systemintegration**: Läuft als native Desktop-App
- **Menüleiste**: Vollständige Menüs mit Tastaturkürzeln
- **Fenster-Management**: Minimieren, maximieren, schließen
- **Plattform-spezifisch**: Angepasst an macOS, Windows und Linux

### Tastaturkürzel
- **⌘/Ctrl + R**: Neu laden
- **⌘/Ctrl + M**: Minimieren
- **⌘/Ctrl + W**: Fenster schließen
- **⌘/Ctrl + Q**: App beenden
- **⌘/Ctrl + ,**: Einstellungen öffnen
- **F11**: Vollbild umschalten
- **F12**: Entwicklertools öffnen

### Sicherheit
- **Sandboxed**: Sichere Ausführung ohne Node.js-Zugriff im Renderer
- **Context Isolation**: Getrennte Contexts für maximale Sicherheit
- **Externe Links**: Öffnen automatisch im Standard-Browser

## 🎨 Anpassungen

### App-Icon
Das App-Icon wird aus `public/taskfuchs.png` geladen. Um ein anderes Icon zu verwenden:

1. Ersetze `public/taskfuchs.png` mit deinem Icon (512x512 px empfohlen)
2. Baue die App neu mit `npm run dist`

### Fenster-Einstellungen
Die Fenster-Konfiguration kann in `public/electron.js` angepasst werden:

```javascript
mainWindow = new BrowserWindow({
  width: 1400,        // Breite
  height: 900,        // Höhe
  minWidth: 800,      // Mindestbreite
  minHeight: 600,     // Mindesthöhe
  // ... weitere Optionen
});
```

## 🔧 Konfiguration

### Electron Builder
Die Build-Konfiguration befindet sich in `package.json` unter dem `"build"` Feld. Hier können angepasst werden:

- App-ID und Produktname
- Zielplattformen und Architekturen
- Installer-Optionen
- Dateien, die in die App eingebunden werden

### Entwicklungsumgebung
- **Development**: Lädt `http://localhost:5173` (Vite Dev Server)
- **Production**: Lädt `dist/index.html` (statische Dateien)

## 🐛 Debugging

### Entwicklertools öffnen
- **Im Entwicklungsmodus**: Automatisch geöffnet
- **Manuell**: F12 oder Menü → Ansicht → Entwicklertools

### Logs anzeigen
```bash
# Electron-Logs in der Konsole
npm run electron-dev
```

## 📱 Plattform-spezifische Hinweise

### macOS
- Unterstützt sowohl Intel (x64) als auch Apple Silicon (arm64)
- DMG-Installer wird erstellt
- Native macOS-Menüs und Verhalten

### Windows
- Unterstützt x64 und x86 (32-bit)
- NSIS-Installer mit Optionen für Desktop-Shortcuts
- Windows-spezifische Menüs und Verhalten

### Linux
- AppImage für einfache Installation
- .deb-Pakete für Debian/Ubuntu
- Funktioniert auf den meisten Linux-Distributionen

## 🎯 Vorteile der Desktop-App

1. **Offline-Verfügbarkeit**: Funktioniert ohne Internetverbindung
2. **Bessere Performance**: Native Desktop-Performance
3. **Systemintegration**: Taskleiste, Benachrichtigungen, etc.
4. **Datenschutz**: Alle Daten bleiben lokal gespeichert
5. **Keine Browser-Abhängigkeit**: Läuft unabhängig vom Browser

## 📋 Bekannte Probleme

- **Erste Installation**: Kann bei macOS/Windows Sicherheitswarnungen auslösen
- **Lösung**: App in den Sicherheitseinstellungen erlauben

## 🔄 Updates

Die Desktop-App prüft derzeit nicht automatisch auf Updates. Neue Versionen müssen manuell installiert werden.

## 🤝 Beitragen

Fehler gefunden oder Verbesserungsvorschläge? Gerne über Issues oder Pull Requests!

---

**Viel Spaß mit TaskFuchs als Desktop-App! 🦊** 