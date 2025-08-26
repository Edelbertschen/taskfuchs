@echo off
REM ===================================================================
REM PowerShell-Kopierskript Starter für TaskFuchs
REM ===================================================================
REM Diese Batch-Datei startet das PowerShell-Skript mit den richtigen
REM Berechtigungen und Parametern
REM ===================================================================

title TaskFuchs PowerShell Kopierskript Starter

echo.
echo ============================================
echo  TaskFuchs PowerShell Kopierskript Starter
echo ============================================
echo.

REM Prüfen ob PowerShell verfügbar ist
where powershell >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell ist nicht verfügbar!
    echo 💡 Verwenden Sie stattdessen: copy-project-windows.bat
    echo.
    pause
    exit /b 1
)

REM Prüfen ob PowerShell-Skript existiert
if not exist "copy-project-windows.ps1" (
    echo ❌ PowerShell-Skript nicht gefunden!
    echo 📁 Gesuchte Datei: copy-project-windows.ps1
    echo 💡 Stellen Sie sicher, dass sich beide Dateien im gleichen Ordner befinden.
    echo.
    pause
    exit /b 1
)

echo 🔧 Starte PowerShell-Kopierskript...
echo.

REM PowerShell-Skript mit Bypass-Berechtigung starten
powershell.exe -ExecutionPolicy Bypass -File "copy-project-windows.ps1"

REM Exit-Code vom PowerShell-Skript weitergeben
set "PS_EXIT_CODE=%ERRORLEVEL%"

echo.
if %PS_EXIT_CODE% equ 0 (
    echo ✅ PowerShell-Skript erfolgreich ausgeführt!
) else (
    echo ❌ PowerShell-Skript wurde mit Fehlercode %PS_EXIT_CODE% beendet.
    echo.
    echo 💡 Mögliche Lösungen:
    echo    • Als Administrator ausführen
    echo    • Verwenden Sie copy-project-windows.bat als Alternative
    echo    • Überprüfen Sie die PowerShell-Ausführungsrichtlinien
)

echo.
pause 