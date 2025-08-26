@echo off
chcp 65001 > nul
echo ============================================
echo     TaskFuchs Windows Build Script
echo ============================================
echo.

echo Checking system requirements...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

npm --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo Node.js version: 
node --version
echo npm version:
npm --version
echo.

echo Step 1: Cleaning previous builds...
if exist "dist-electron" (
    echo Removing dist-electron directory...
    rmdir /s /q "dist-electron"
    echo ✓ Cleaned dist-electron directory
)

if exist "dist" (
    echo Removing dist directory...
    rmdir /s /q "dist"
    echo ✓ Cleaned dist directory
)

echo.
echo Step 2: Installing dependencies...
echo This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)
echo ✓ Dependencies installed successfully

echo.
echo Step 3: Building React app...
echo Building optimized production build...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build React app
    echo Please check the console output above for errors
    pause
    exit /b 1
)
echo ✓ React app built successfully

echo.
echo Step 4: Building Electron app for Windows...
echo This will create installer files for both x64 and ia32 architectures...
echo Please wait, this may take several minutes...

set DEBUG=electron-builder
call npm run dist:win-debug
if %errorlevel% neq 0 (
    echo ERROR: Failed to build Electron app
    echo.
    echo Common solutions:
    echo - Check if Windows Defender is blocking the build
    echo - Try running as Administrator
    echo - Check if icon.ico file exists in public folder
    echo - Ensure sufficient disk space (at least 2GB free)
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo     BUILD COMPLETED SUCCESSFULLY!
echo ============================================
echo.
echo Output files are in the dist-electron directory:
echo.
dir "dist-electron\*.exe" /B 2>nul
if %errorlevel% neq 0 (
    echo No .exe files found in dist-electron directory
    echo This might indicate a build problem
) else (
    echo.
    echo Installer files:
    for %%f in (dist-electron\*.exe) do echo   %%f
)

echo.
echo To install TaskFuchs:
echo 1. Navigate to the dist-electron folder
echo 2. Run TaskFuchs-1.0.0.exe (main installer)
echo 3. If blocked by Windows Defender, click "More info" then "Run anyway"
echo.
echo Alternative files:
echo - TaskFuchs-1.0.0-x64.exe (64-bit installer)
echo - TaskFuchs-1.0.0-ia32.exe (32-bit installer)
echo - win-unpacked folder (portable version - no installation needed)
echo.
echo If the installer doesn't open:
echo 1. Right-click on the .exe file
echo 2. Select "Run as administrator"
echo 3. Or temporarily disable Windows Defender
echo.
pause 