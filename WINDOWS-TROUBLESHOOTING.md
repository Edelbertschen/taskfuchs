# Windows Troubleshooting Guide für TaskFuchs

## Häufige Probleme und Lösungen

### 1. Installer startet nicht / Keine Reaktion

**Mögliche Ursachen:**
- Windows SmartScreen blockiert die App
- Antivirenprogramm blockiert die Installation
- Berechtigungsprobleme
- Beschädigte Download-Datei

**Lösungen:**
1. **SmartScreen umgehen:**
   - Rechtsklick auf die .exe-Datei
   - "Eigenschaften" → "Allgemein" → "Entsperren" (falls verfügbar)
   - Oder: Bei SmartScreen-Warnung auf "Weitere Informationen" → "Trotzdem ausführen"

2. **Antivirenprogramm:**
   - Temporär Echtzeitschutz deaktivieren
   - Installer zur Ausnahmeliste hinzufügen

3. **Als Administrator ausführen:**
   - Rechtsklick auf die .exe-Datei
   - "Als Administrator ausführen" wählen

### 2. App installiert sich, startet aber nicht

**Debugging-Schritte:**
1. **Logs prüfen:**
   - Öffne: `%APPDATA%\TaskFuchs\error.log`
   - Prüfe auf Fehlermeldungen

2. **Portable Version testen:**
   - Verwende den `win-unpacked` Ordner
   - Führe `TaskFuchs.exe` direkt aus

3. **Kommandozeile verwenden:**
   ```cmd
   cd "C:\Program Files\TaskFuchs"
   TaskFuchs.exe --verbose --no-sandbox
   ```

### 3. Leeres Fenster / Weißer Bildschirm

**Mögliche Ursachen:**
- Datei-Pfad-Probleme
- Fehlende Abhängigkeiten
- Grafikkarten-Probleme

**Lösungen:**
1. **Hardware-Beschleunigung deaktivieren:**
   - Starte mit: `TaskFuchs.exe --disable-gpu`

2. **Kompatibilitätsmodus:**
   - Rechtsklick auf TaskFuchs.exe → Eigenschaften
   - Kompatibilität → "Programm im Kompatibilitätsmodus ausführen"

### 4. Fehlerdiagnose

**Debugging-Befehle:**
```cmd
# Ausführliche Logs
TaskFuchs.exe --verbose --enable-logging

# Entwicklertools aktivieren
TaskFuchs.exe --remote-debugging-port=9222

# Ohne Sandbox (für Testzwecke)
TaskFuchs.exe --no-sandbox --disable-web-security
```

**Log-Dateien Speicherorte:**
- Fehler-Logs: `%APPDATA%\TaskFuchs\error.log`
- Electron-Logs: `%APPDATA%\TaskFuchs\logs\`

### 5. Manuelle Installation

Falls der Installer nicht funktioniert:

1. **Portable Version verwenden:**
   - Lade die `win-unpacked` Version herunter
   - Extrahiere in einen Ordner (z.B. `C:\TaskFuchs`)
   - Führe `TaskFuchs.exe` aus

2. **Verknüpfungen erstellen:**
   ```cmd
   # Desktop-Verknüpfung
   mklink "%USERPROFILE%\Desktop\TaskFuchs.lnk" "C:\TaskFuchs\TaskFuchs.exe"
   
   # Startmenü-Verknüpfung
   mklink "%APPDATA%\Microsoft\Windows\Start Menu\Programs\TaskFuchs.lnk" "C:\TaskFuchs\TaskFuchs.exe"
   ```

### 6. Systemanforderungen

**Minimum:**
- Windows 10 (64-bit)
- 4 GB RAM
- 200 MB freier Speicherplatz

**Empfohlen:**
- Windows 11 (64-bit)
- 8 GB RAM
- Moderne Grafikkarte mit Hardware-Beschleunigung

### 7. Bekannte Probleme

**Problem:** App stürzt beim Start ab
**Lösung:** Lösche `%APPDATA%\TaskFuchs` und starte neu

**Problem:** Installer hängt sich auf
**Lösung:** Beende alle Electron-/TaskFuchs-Prozesse im Task-Manager

**Problem:** Schriftarten werden nicht korrekt angezeigt
**Lösung:** Installiere die neuesten Windows-Updates

### 8. Support

Falls die Probleme weiterhin bestehen:

1. **Erstelle einen Bug-Report mit:**
   - Windows-Version (`winver`)
   - Inhalt der `error.log`
   - Screenshots der Fehlermeldungen
   - Genaue Schritte zur Reproduktion

2. **Weitere Hilfe:**
   - GitHub Issues: [Repository-Link]
   - E-Mail: support@taskfuchs.de

### 9. Entwickler-Builds

Für die neueste Entwicklerversion:
```cmd
git clone [repository-url]
cd TaskFuchs/web-app
npm install
npm run dist:win-debug
``` 