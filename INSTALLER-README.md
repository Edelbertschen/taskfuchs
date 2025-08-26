# 🦊 TaskFuchs Mac Installer

## Superschicker Mac-Installer für TaskFuchs

Dieser professionelle Mac-Installer wurde speziell für TaskFuchs entwickelt und bietet eine elegante Installationserfahrung.

## 🎨 Features

### Design-Highlights
- **Professioneller Gradient-Hintergrund** in TaskFuchs-Farben
- **Schönes TaskFuchs-Logo** mit Drop-Shadow-Effekt
- **Klare Installationsanweisungen** auf Deutsch
- **Intuitive Drag & Drop-Zone** mit visuellen Hinweisen
- **Dekorative Elemente** für ein poliertes Erscheinungsbild

### Technische Features
- **DMG-Format** für einfache Distribution
- **Code-Signierung** vorbereitet (Entitlements)
- **Hardened Runtime** für Sicherheit
- **Universelle Binaries** (x64 + ARM64)
- **Optimierte Fenstergröße** (660x400px)

## 🔧 Installation erstellen

### Voraussetzungen
- Node.js (>= 16.x)
- npm
- macOS (für DMG-Erstellung)

### Automatischer Build
```bash
# Ausführbares Script verwenden
./build-installer.sh
```

### Manueller Build
```bash
# Dependencies installieren
npm install

# App bauen
npm run build

# Mac-Installer erstellen
npm run electron-pack
```

## 📦 Installer-Konfiguration

Die Installer-Konfiguration befindet sich in `package.json` unter dem `build` Objekt:

### DMG-Konfiguration
- **Titel**: "TaskFuchs Installation"
- **Hintergrund**: Professionelles SVG-Design
- **Layout**: Optimiert für Drag & Drop
- **Format**: ULFO (komprimiert)

### Sicherheit
- **Entitlements**: Definiert in `build/entitlements.mac.plist`
- **Hardened Runtime**: Aktiviert
- **Gatekeeper**: Konfiguriert

## 🎯 Verwendung

1. **DMG-Datei öffnen**
   - Doppelklick auf die `.dmg` Datei
   - Das schöne Installer-Fenster öffnet sich

2. **TaskFuchs installieren**
   - TaskFuchs-Icon in den Programme-Ordner ziehen
   - Der Pfeil zeigt die richtige Richtung

3. **Installation abschließen**
   - DMG-Datei auswerfen
   - TaskFuchs aus dem Programme-Ordner starten

## 🌟 Design-Details

### Farbschema
- **Primärfarbe**: #667eea (Blau)
- **Sekundärfarbe**: #764ba2 (Lila)
- **Akzentfarbe**: #f093fb (Rosa)
- **TaskFuchs-Orange**: #ff6b35

### Typografie
- **Schrift**: SF Pro Display (macOS-nativ)
- **Fallback**: system-ui, Arial, sans-serif
- **Schatten**: Subtile Drop-Shadows für Tiefe

### Layout
- **App-Icon**: Position (180, 170)
- **Programme-Ordner**: Position (480, 170)
- **Fenstergröße**: 660x400px (optimiert für Retina)

## 🚀 Deployment

### Lokale Distribution
```bash
# DMG-Datei teilen
cp dist-electron/TaskFuchs\ Setup\ 0.0.0.dmg ~/Desktop/
```

### GitHub Releases
```bash
# Mit GitHub Actions (konfiguriert)
git tag v1.0.0
git push origin v1.0.0
```

## 📝 Anpassungen

### Hintergrund ändern
1. `public/dmg-background.svg` bearbeiten
2. Neue Farben, Logo oder Layout anpassen
3. Installer neu bauen

### Icon-Positionen anpassen
1. `package.json` → `build.dmg.contents` bearbeiten
2. X/Y-Koordinaten anpassen
3. Installer neu bauen

## 🦊 Branding

Der Installer verwendet das komplette TaskFuchs-Branding:
- **Logo**: Stilisierter Fuchs in Orange
- **Typografie**: Professionelle Schriftarten
- **Farben**: Konsistente Farbpalette
- **Sprache**: Deutsche Benutzerführung

## 🔍 Troubleshooting

### Häufige Probleme
1. **DMG wird nicht erstellt**
   - Überprüfe macOS-Version
   - Installiere Xcode Command Line Tools

2. **App startet nicht**
   - Überprüfe Entitlements
   - Signierung möglicherweise erforderlich

3. **Falsches Layout**
   - Prüfe SVG-Dimensionen
   - Validiere DMG-Konfiguration

---

**Erstellt mit ❤️ für TaskFuchs** 