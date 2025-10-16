@echo off
echo ========================================
echo Starting Model Uploader Services...
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install from https://nodejs.org/
    pause
    exit /b 1
)

:: Navigate to service-server directory
cd /d "%~dp0src\subtools\service-server"

:: Kill any existing instances
echo Stopping existing services...
taskkill /F /FI "WINDOWTITLE eq Service Server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Service Interface*" >nul 2>&1

:: Start service-server
echo Starting Service Server (Port 3011)...
start "Service Server" cmd /k "node server.js"

:: Wait for server initialization
timeout /t 3 /nobreak > nul

:: Navigate to service-interface directory
cd /d "%~dp0src\subtools\service-interface"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing service-interface dependencies...
    call npm install
)

:: Start service-interface
echo Starting Service Interface (Port 3010)...
start "Service Interface" cmd /k "npm run dev"

:: Wait before opening browser
timeout /t 3 /nobreak > nul

:: Open browser
echo Opening browser...
start http://localhost:3010

echo.
echo ========================================
echo Model Uploader Services Started!
echo ========================================
echo Service Server API: http://localhost:3011
echo Service Interface:  http://localhost:3010
echo ========================================
echo.
echo To stop services: Close both command windows
echo.
pause
