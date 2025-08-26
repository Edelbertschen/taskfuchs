#!/bin/bash

# TaskFuchs Projekt sauber kopieren
# Verwendung: ./copy-project.sh D:\v49

if [ -z "$1" ]; then
    echo "❌ Fehler: Zielordner nicht angegeben"
    echo "Verwendung: ./copy-project.sh /pfad/zum/zielordner"
    exit 1
fi

SOURCE_DIR="$(pwd)"
TARGET_DIR="$1"

echo "🚀 Kopiere TaskFuchs Projekt..."
echo "   Von: $SOURCE_DIR"
echo "   Nach: $TARGET_DIR"
echo ""

# Erstelle Zielordner falls nicht vorhanden
mkdir -p "$TARGET_DIR"

echo "📋 Kopiere Dateien (ohne node_modules, dist-electron, .git)..."

# Verwende rsync für intelligentes Kopieren
rsync -av \
  --exclude='node_modules' \
  --exclude='dist-electron' \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  --exclude='.npm' \
  --exclude='.cache' \
  "$SOURCE_DIR/" "$TARGET_DIR/"

echo ""
echo "✅ Projekt erfolgreich kopiert!"
echo ""
echo "🔧 Nächste Schritte im neuen Ordner:"
echo "   cd \"$TARGET_DIR\""
echo "   npm install"
echo "   npm run dev"
echo ""
echo "💡 Das spart Platz und Zeit:"
echo "   - node_modules: 1.4GB (wird neu generiert)"
echo "   - dist-electron: 3.5MB (wird neu gebaut)" 