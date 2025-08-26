#!/bin/bash

# TaskFuchs Mac Installer Build Script
# Dieses Script erstellt einen superschicken Mac-Installer für TaskFuchs

echo "🦊 TaskFuchs Mac Installer Builder"
echo "================================="

# Prüfe ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo "❌ Node.js ist nicht installiert. Bitte installiere Node.js zuerst."
    exit 1
fi

# Prüfe ob npm installiert ist
if ! command -v npm &> /dev/null; then
    echo "❌ npm ist nicht installiert. Bitte installiere npm zuerst."
    exit 1
fi

echo "✅ Node.js und npm gefunden"

# Installiere Dependencies
echo "📦 Installiere Dependencies..."
npm install

# Baue die App
echo "🔨 Baue die App..."
npm run build

# Prüfe ob Build erfolgreich war
if [ ! -d "dist" ]; then
    echo "❌ Build fehlgeschlagen. Dist-Ordner nicht gefunden."
    exit 1
fi

echo "✅ App erfolgreich gebaut"

# Erstelle den Mac-Installer
echo "🎨 Erstelle den superschicken Mac-Installer..."
npm run electron-pack

# Prüfe ob DMG erstellt wurde
if [ -f "dist-electron/TaskFuchs Setup 0.0.0.dmg" ]; then
    echo "🎉 Mac-Installer erfolgreich erstellt!"
    echo "📁 Zu finden in: dist-electron/TaskFuchs Setup 0.0.0.dmg"
    
    # Öffne den Ordner
    open dist-electron/
    
    echo ""
    echo "🦊 TaskFuchs ist bereit für die Installation!"
    echo "   Das DMG-Image hat ein professionelles Design mit:"
    echo "   ✨ Schönem Gradient-Hintergrund"
    echo "   🎯 Klaren Installationsanweisungen"
    echo "   🖼️ Professionellem Layout"
    echo "   🎨 TaskFuchs-Branding"
    echo ""
    echo "   Einfach das DMG öffnen und TaskFuchs in den Programme-Ordner ziehen!"
else
    echo "❌ Fehler beim Erstellen des Mac-Installers"
    exit 1
fi 