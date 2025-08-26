@echo off
echo Building TaskFuchs for Windows...
echo.

echo Step 1: Cleaning previous builds...
if exist "dist-electron" (
    rmdir /s /q "dist-electron"
    echo Cleaned dist-electron directory
)

if exist "dist" (
    rmdir /s /q "dist"
    echo Cleaned dist directory
)

echo.
echo Step 2: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies
    pause
    exit /b 1
)

echo.
echo Step 3: Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo Error building React app
    pause
    exit /b 1
)

echo.
echo Step 4: Building Electron app for Windows...
set DEBUG=electron-builder
call npm run dist:win
if %errorlevel% neq 0 (
    echo Error building Electron app
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo Output files are in the dist-electron directory
echo.
echo To run the installer, look for:
echo - TaskFuchs Setup *.exe (installer)
echo - win-unpacked folder (portable version)
echo.
pause 