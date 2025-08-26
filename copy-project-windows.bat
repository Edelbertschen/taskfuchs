@echo off
setlocal enabledelayedexpansion

REM ===================================================================
REM TaskFuchs Projekt-Kopierskript für Windows (Batch-Version)
REM ===================================================================
REM Einfache Version zum Kopieren des Entwicklungsprojekts
REM Schließt automatisch unnötige Dateien und Ordner aus
REM ===================================================================

title TaskFuchs Projekt Kopieren

REM Farben definieren (falls verfügbar)
if exist "%WINDIR%\System32\choice.exe" (
    set "GREEN=[92m"
    set "RED=[91m"
    set "YELLOW=[93m"
    set "BLUE=[94m"
    set "RESET=[0m"
) else (
    set "GREEN="
    set "RED="
    set "YELLOW="
    set "BLUE="
    set "RESET="
)

echo.
echo %BLUE%============================================%RESET%
echo %BLUE% TaskFuchs Projekt Kopierskript%RESET%
echo %BLUE%============================================%RESET%
echo.

REM Aktueller Ordner
set "SOURCE_DIR=%cd%"
echo %BLUE%📁 Quellverzeichnis: %SOURCE_DIR%%RESET%

REM Zeitstempel für Zielordner erstellen
for /f "tokens=1-4 delims=:.," %%a in ("%time%") do (
    set "TIME_STAMP=%%a-%%b-%%c"
)
for /f "tokens=1-3 delims=/- " %%a in ("%date%") do (
    set "DATE_STAMP=%%c-%%b-%%a"
)

REM Projektname extrahieren
for %%i in ("%cd%") do set "PROJECT_NAME=%%~ni"

REM Zielverzeichnis bestimmen
set "DEST_DIR=%cd%\..\%PROJECT_NAME%_copy_%DATE_STAMP%_%TIME_STAMP%"
echo %BLUE%📁 Zielverzeichnis: %DEST_DIR%%RESET%

REM Prüfen ob Zielverzeichnis bereits existiert
if exist "%DEST_DIR%" (
    echo %YELLOW%⚠️  Zielverzeichnis existiert bereits!%RESET%
    set /p "OVERWRITE=Möchten Sie es überschreiben? (j/N): "
    if /i not "!OVERWRITE!"=="j" if /i not "!OVERWRITE!"=="ja" (
        echo %RED%❌ Vorgang abgebrochen.%RESET%
        pause
        exit /b 1
    )
    echo %YELLOW%Lösche vorhandenes Verzeichnis...%RESET%
    rmdir /s /q "%DEST_DIR%" 2>nul
)

REM Zielverzeichnis erstellen
echo %BLUE%📁 Erstelle Zielverzeichnis...%RESET%
mkdir "%DEST_DIR%" 2>nul

echo.
echo %BLUE%============================================%RESET%
echo %BLUE% Kopiervorgang wird gestartet...%RESET%
echo %BLUE%============================================%RESET%
echo.

REM Hauptverzeichnisse kopieren (mit Ausschlüssen)
echo %GREEN%📄 Kopiere Hauptdateien...%RESET%
xcopy "%SOURCE_DIR%\*.json" "%DEST_DIR%\" /y /q >nul 2>&1
xcopy "%SOURCE_DIR%\*.js" "%DEST_DIR%\" /y /q >nul 2>&1
xcopy "%SOURCE_DIR%\*.ts" "%DEST_DIR%\" /y /q >nul 2>&1
xcopy "%SOURCE_DIR%\*.md" "%DEST_DIR%\" /y /q >nul 2>&1
xcopy "%SOURCE_DIR%\*.txt" "%DEST_DIR%\" /y /q >nul 2>&1
xcopy "%SOURCE_DIR%\*.html" "%DEST_DIR%\" /y /q >nul 2>&1
xcopy "%SOURCE_DIR%\*.css" "%DEST_DIR%\" /y /q >nul 2>&1
xcopy "%SOURCE_DIR%\*.svg" "%DEST_DIR%\" /y /q >nul 2>&1
xcopy "%SOURCE_DIR%\*.pdf" "%DEST_DIR%\" /y /q >nul 2>&1
xcopy "%SOURCE_DIR%\*.bat" "%DEST_DIR%\" /y /q >nul 2>&1
xcopy "%SOURCE_DIR%\*.sh" "%DEST_DIR%\" /y /q >nul 2>&1

REM Source-Verzeichnis kopieren
if exist "%SOURCE_DIR%\src" (
    echo %GREEN%📁 Kopiere src/...%RESET%
    xcopy "%SOURCE_DIR%\src" "%DEST_DIR%\src\" /e /i /y /q >nul 2>&1
)

REM Public-Verzeichnis kopieren
if exist "%SOURCE_DIR%\public" (
    echo %GREEN%📁 Kopiere public/...%RESET%
    xcopy "%SOURCE_DIR%\public" "%DEST_DIR%\public\" /e /i /y /q >nul 2>&1
)

REM Weitere wichtige Verzeichnisse
if exist "%SOURCE_DIR%\assets" (
    echo %GREEN%📁 Kopiere assets/...%RESET%
    xcopy "%SOURCE_DIR%\assets" "%DEST_DIR%\assets\" /e /i /y /q >nul 2>&1
)

if exist "%SOURCE_DIR%\docs" (
    echo %GREEN%📁 Kopiere docs/...%RESET%
    xcopy "%SOURCE_DIR%\docs" "%DEST_DIR%\docs\" /e /i /y /q >nul 2>&1
)

if exist "%SOURCE_DIR%\scripts" (
    echo %GREEN%📁 Kopiere scripts/...%RESET%
    xcopy "%SOURCE_DIR%\scripts" "%DEST_DIR%\scripts\" /e /i /y /q >nul 2>&1
)

REM Versteckte Konfigurationsdateien kopieren (aber nicht .git)
echo %GREEN%📄 Kopiere Konfigurationsdateien...%RESET%
if exist "%SOURCE_DIR%\.gitignore" copy "%SOURCE_DIR%\.gitignore" "%DEST_DIR%\" >nul 2>&1
if exist "%SOURCE_DIR%\.eslintrc*" copy "%SOURCE_DIR%\.eslintrc*" "%DEST_DIR%\" >nul 2>&1
if exist "%SOURCE_DIR%\.prettierrc*" copy "%SOURCE_DIR%\.prettierrc*" "%DEST_DIR%\" >nul 2>&1
if exist "%SOURCE_DIR%\.env.example" copy "%SOURCE_DIR%\.env.example" "%DEST_DIR%\" >nul 2>&1

REM Statistiken zählen (vereinfacht)
set "COPIED_COUNT=0"
for /r "%DEST_DIR%" %%f in (*) do (
    set /a COPIED_COUNT+=1
)

echo.
echo %BLUE%============================================%RESET%
echo %BLUE% Kopiervorgang abgeschlossen!%RESET%
echo %BLUE%============================================%RESET%
echo.

echo %GREEN%✅ Erfolgreich kopiert!%RESET%
echo %BLUE%📊 Statistiken:%RESET%
echo    • Kopierte Dateien: ca. %COPIED_COUNT%
echo    • Zielverzeichnis: %DEST_DIR%
echo.

echo %YELLOW%📋 Ausgeschlossene Elemente:%RESET%
echo    • node_modules/
echo    • .git/
echo    • dist/
echo    • dist-electron/
echo    • build/
echo    • *.log Dateien
echo    • .env.local
echo    • .env.production
echo.

echo %BLUE%💡 Hinweis:%RESET%
echo Für erweiterte Optionen verwenden Sie das PowerShell-Skript:
echo copy-project-windows.ps1
echo.

REM Zielordner öffnen anbieten
set /p "OPEN_FOLDER=Möchten Sie den Zielordner im Explorer öffnen? (j/N): "
if /i "!OPEN_FOLDER!"=="j" (
    start explorer.exe "%DEST_DIR%"
) else if /i "!OPEN_FOLDER!"=="ja" (
    start explorer.exe "%DEST_DIR%"
)

echo.
echo %GREEN%🎉 Kopiervorgang erfolgreich abgeschlossen!%RESET%
echo.
pause 