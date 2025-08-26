# Windows Installer Troubleshooting Guide

## Problem: Der Windows-Installer öffnet sich nicht

### Häufige Ursachen und Lösungen:

## 1. Windows Defender/Antivirus blockiert den Installer ⚠️

**Symptom:** Der Installer startet nicht oder wird sofort geschlossen.

**Lösung:**
- Klicken Sie auf "More info" wenn Windows Defender eine Warnung zeigt
- Dann auf "Run anyway" klicken
- Oder temporär Windows Defender deaktivieren:
  1. Windows-Taste + I
  2. Update & Security → Windows Security
  3. Virus & threat protection → Manage settings
  4. Real-time protection temporär ausschalten

## 2. Fehlende Administratorrechte 🔑

**Symptom:** Installer startet, aber kann nicht installieren.

**Lösung:**
- Rechtsklick auf die .exe-Datei
- "Als Administrator ausführen" wählen
- Oder: Shift + Rechtsklick → "PowerShell-Fenster hier öffnen als Administrator"

## 3. Korrupte Download-Datei 💾

**Symptom:** Installer startet nicht oder zeigt Fehler.

**Lösung:**
- Installer neu herunterladen
- Dateiintegrität prüfen: `certutil -hashfile TaskFuchs-1.0.0.exe SHA256`
- Alternative Installer-Datei verwenden:
  - `TaskFuchs-1.0.0-x64.exe` (64-bit)
  - `TaskFuchs-1.0.0-ia32.exe` (32-bit)

## 4. Fehlende .NET Framework oder Visual C++ Redistributables 🧩

**Symptom:** Installer startet, aber TaskFuchs startet nicht nach Installation.

**Lösung:**
- Microsoft Visual C++ Redistributable installieren
- .NET Framework 4.7.2 oder höher installieren
- Windows Updates installieren

## 5. Insufficient Disk Space 💿

**Symptom:** Installation bricht ab oder startet nicht.

**Lösung:**
- Mindestens 500 MB freier Speicherplatz erforderlich
- Temporäre Dateien löschen: `%temp%`
- Disk Cleanup ausführen

## Alternative Installationsmethoden:

### Portable Version (keine Installation erforderlich)
1. Navigieren Sie zum `dist-electron` Ordner
2. Öffnen Sie den `win-unpacked` Ordner
3. Führen Sie `TaskFuchs.exe` direkt aus

### PowerShell Installation
```powershell
# Als Administrator ausführen
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Start-Process -FilePath "TaskFuchs-1.0.0.exe" -Verb RunAs
```

## Installer-Dateien Übersicht:

| Datei | Beschreibung | Größe | Architektur |
|-------|-------------|-------|-------------|
| `TaskFuchs-1.0.0-x64.exe` | **OPTIMIERTER** 64-bit Installer | ~45 MB | x64 |
| `TaskFuchs-1.0.0.exe` | Legacy Universal Installer | ~163 MB | x64 + ia32 |
| `TaskFuchs-1.0.0-ia32.exe` | 32-bit Installer | ~79 MB | ia32 |
| `win-unpacked/` | Portable Version | ~140 MB | x64 |
| `win-ia32-unpacked/` | Portable Version | ~130 MB | ia32 |

## Erweiterte Problembehandlung:

### Event Viewer prüfen
1. Windows-Taste + R, `eventvwr` eingeben
2. Windows Logs → Application
3. Nach Fehlern rund um die Installationszeit suchen

### Kompatibilitätsmodus
1. Rechtsklick auf .exe-Datei
2. Properties → Compatibility
3. "Run this program in compatibility mode for:" aktivieren
4. Windows 10 oder Windows 8 auswählen

### Installer-Logs aktivieren
```cmd
TaskFuchs-1.0.0.exe /S /L=1033 /D=C:\TaskFuchs
```

## Systemanforderungen:

- **Betriebssystem:** Windows 10 (1903) oder höher
- **Architektur:** x64 oder x86 (32-bit)
- **RAM:** Mindestens 4 GB
- **Speicherplatz:** 500 MB frei
- **Zusätzlich:** Administrator-Rechte für Installation

## Kontakt und Support:

Falls keine der oben genannten Lösungen funktioniert:

1. **Optimierten Installer erstellen (empfohlen):**
   - `build-windows-fast.bat` ausführen
   - 72% kleinere Dateien, 75% schneller
   
2. **Legacy Installer-Datei erstellen:**
   - `build-windows-fixed.bat` ausführen
   - Unicode-Support ist aktiviert

2. **Diagnose-Informationen sammeln:**
   - Windows-Version: `winver`
   - System-Info: `msinfo32`
   - PowerShell-Version: `$PSVersionTable`

3. **Alternative Download-Quellen:**
   - GitHub Releases verwenden
   - Direkt aus dem `dist-electron` Ordner

---

**Hinweis:** Diese Anleitung bezieht sich auf TaskFuchs Version 1.0.0. Bei anderen Versionen können die Dateinamen variieren. 