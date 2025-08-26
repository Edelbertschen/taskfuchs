# 📁 TaskFuchs Projekt-Kopierskripte

Diese Sammlung enthält Windows-Skripte zum intelligenten Kopieren des TaskFuchs-Entwicklungsprojekts, wobei automatisch unnötige Dateien und Ordner ausgeschlossen werden.

## 🚀 Verfügbare Skripte

### 1. PowerShell-Skript (Empfohlen)
**Datei:** `copy-project-windows.ps1`
- ✅ Erweiterte Funktionen und Parameter
- ✅ Detaillierte Statistiken und Fortschrittsanzeige
- ✅ Farbige Ausgabe und benutzerfreundliche Oberfläche
- ✅ Intelligente Dateierkennung und -ausschluss
- ✅ Größenberechnung und Performance-Metriken

### 2. Batch-Skript (Einfach)
**Datei:** `copy-project-windows.bat`
- ✅ Funktioniert auf allen Windows-Systemen
- ✅ Keine zusätzlichen Abhängigkeiten
- ✅ Einfache Bedienung per Doppelklick
- ✅ Grundlegende Funktionen für Standard-Nutzung

## 📋 Automatisch ausgeschlossene Elemente

### 🚫 Ordner
```
node_modules/          # NPM/Node.js Abhängigkeiten
.git/                  # Git-Repository-Daten
.vscode/               # Visual Studio Code Einstellungen
.idea/                 # IntelliJ/WebStorm Einstellungen
dist/                  # Build-Ausgabeverzeichnis
dist-electron/         # Electron-Build-Ausgabe
build/                 # Alternative Build-Ordner
out/                   # Weitere Build-Ausgabe
.next/                 # Next.js Build-Cache
.nuxt/                 # Nuxt.js Build-Cache
coverage/              # Test-Coverage-Berichte
.nyc_output/           # NYC Coverage-Daten
logs/                  # Log-Dateien
```

### 🚫 Dateien
```
*.log                  # Log-Dateien
*.tmp, *.temp          # Temporäre Dateien
*.cache                # Cache-Dateien
*.swp, *.swo, *~       # Editor-Backup-Dateien
.DS_Store              # macOS System-Dateien
Thumbs.db              # Windows Thumbnail-Cache
.env.local             # Lokale Umgebungsvariablen
.env.production        # Produktions-Umgebungsvariablen
```

## 🛠️ Verwendung

### PowerShell-Skript

#### Einfache Verwendung:
```powershell
.\copy-project-windows.ps1
```

#### Mit Parametern:
```powershell
# Mit eigenem Zielpfad
.\copy-project-windows.ps1 -DestinationPath "C:\Projekte\TaskFuchs_Backup"

# Mit node_modules kopieren
.\copy-project-windows.ps1 -IncludeNodeModules

# Mit Git-Repository kopieren
.\copy-project-windows.ps1 -IncludeGit

# Detaillierte Ausgabe
.\copy-project-windows.ps1 -Verbose

# Kombiniert
.\copy-project-windows.ps1 -DestinationPath "C:\Backup" -IncludeNodeModules -Verbose
```

#### Verfügbare Parameter:
- **`-DestinationPath`**: Eigener Zielpfad (Standard: automatisch generiert)
- **`-IncludeNodeModules`**: node_modules-Ordner mit kopieren
- **`-IncludeGit`**: .git-Repository mit kopieren
- **`-Verbose`**: Detaillierte Ausgabe aller kopierten Dateien

### Batch-Skript

#### Verwendung:
```cmd
# Einfach per Doppelklick auf die Datei
copy-project-windows.bat

# Oder über Kommandozeile
.\copy-project-windows.bat
```

## 📊 Beispiel-Ausgabe

```
============================================
 TaskFuchs Projekt Kopierskript
============================================

📁 Quellverzeichnis: C:\Projekte\v48
📁 Zielverzeichnis: C:\Projekte\v48_copy_2024-01-15_14-30-25

============================================
 Kopiervorgang wird gestartet...
============================================

✅ Erfolgreich kopiert!
📊 Statistiken:
   • Kopierte Dateien: 247
   • Übersprungene Dateien: 15,432
   • Gesamtgröße: 12.34 MB
   • Dauer: 3.45 Sekunden
   • Zielverzeichnis: C:\Projekte\v48_copy_2024-01-15_14-30-25

📋 Ausgeschlossene Elemente:
   • node_modules
   • .git
   • dist
   • dist-electron
   • ...

🎉 Kopiervorgang erfolgreich abgeschlossen!
```

## ⚡ Leistungsvergleich

| Aspekt | Vollständige Kopie | Intelligente Kopie | Ersparnis |
|--------|-------------------|-------------------|-----------|
| **Dateien** | ~18,000 | ~250 | 98.6% |
| **Größe** | ~850 MB | ~12 MB | 98.5% |
| **Zeit** | ~5-10 Min | ~3-5 Sek | 99%+ |

## 🔧 Anpassungen

### Zusätzliche Ausschlüsse hinzufügen:

#### PowerShell-Skript:
```powershell
# In der Datei copy-project-windows.ps1 die Arrays erweitern:
$ExcludedFolders += 'mein-ordner'
$ExcludedExtensions += '*.xyz'
```

#### Batch-Skript:
```batch
REM Weitere xcopy-Befehle für zusätzliche Dateitypen hinzufügen
```

## 🚨 Wichtige Hinweise

### Sicherheit:
- ✅ Persönliche Daten (`.env.local`, `.env.production`) werden automatisch ausgeschlossen
- ✅ Git-Repository wird standardmäßig nicht kopiert
- ✅ Keine Build-Artefakte oder temporäre Dateien werden übertragen

### PowerShell-Ausführungsrichtlinien:
Falls das PowerShell-Skript nicht ausgeführt werden kann:
```powershell
# Ausführungsrichtlinie temporär ändern
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\copy-project-windows.ps1

# Oder dauerhaft für den aktuellen Benutzer
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📁 Verzeichnisstruktur nach dem Kopieren

```
TaskFuchs_copy_2024-01-15_14-30-25/
├── 📄 package.json
├── 📄 package-lock.json
├── 📄 vite.config.ts
├── 📄 tsconfig.json
├── 📄 tailwind.config.js
├── 📄 README.md
├── 📄 *.md (alle Markdown-Dateien)
├── 📄 *.bat, *.sh (Skripte)
├── 📄 .gitignore
├── 📄 .eslintrc* (ESLint-Konfiguration)
├── 📁 src/
│   ├── 📁 components/
│   ├── 📁 context/
│   ├── 📁 utils/
│   ├── 📁 types/
│   └── 📄 ...
├── 📁 public/
│   ├── 📄 *.svg
│   ├── 📁 screenshots/
│   └── 📄 ...
└── 📁 ... (weitere relevante Ordner)
```

## 💡 Tipps

1. **Regelmäßige Backups**: Verwenden Sie die Skripte regelmäßig für Backups
2. **Versionskontrolle**: Der Zeitstempel im Ordnernamen hilft bei der Versionierung
3. **Schnelle Verteilung**: Ideal zum Teilen des Projekts ohne unnötigen Ballast
4. **Entwicklungsumgebung**: Perfekt für das Einrichten auf neuen Rechnern

## 🆘 Problembehandlung

### Problem: "Zugriff verweigert"
**Lösung:** Als Administrator ausführen oder Zielverzeichnis ändern

### Problem: PowerShell-Skript wird nicht ausgeführt
**Lösung:** Ausführungsrichtlinien anpassen (siehe oben) oder Batch-Skript verwenden

### Problem: Unvollständige Kopie
**Lösung:** Verbose-Modus aktivieren um zu sehen welche Dateien übersprungen werden

---

**Erstellt für TaskFuchs v48** 🦊
*Letzte Aktualisierung: Januar 2024* 