@echo off
setlocal enabledelayedexpansion

REM ========================================
REM Kyool Media Uploader - START
REM ========================================

echo ========================================
echo Kyool Media Uploader
echo ========================================
echo.

REM Create logs directory
if not exist "logs" mkdir logs

REM Log file
set "LOGFILE=logs\startup.log"
echo [%date% %time%] Starting Kyool Media Uploader >> "%LOGFILE%"

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found! >> "%LOGFILE%"
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js 18+ from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   Node.js version: %NODE_VERSION%
echo [%date% %time%] Node.js: %NODE_VERSION% >> "%LOGFILE%"

REM Kill any existing instances
echo Stopping any existing instances...
taskkill /F /FI "WINDOWTITLE eq Kyool Media Server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Kyool Media UI*" >nul 2>&1
timeout /t 1 /nobreak >nul

REM Check if source files exist
if not exist "src\subtools\service-server\server.js" (
    echo ERROR: Server source not found! >> "%LOGFILE%"
    echo ERROR: Server source files not found
    echo Expected: src\subtools\service-server\server.js
    echo.
    pause
    exit /b 1
)

if not exist "src\subtools\service-interface\serve.js" (
    echo ERROR: UI source not found! >> "%LOGFILE%"
    echo ERROR: UI source files not found
    echo Expected: src\subtools\service-interface\serve.js
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo node_modules not found. Running npm install...
    echo [%date% %time%] Running npm install >> "%LOGFILE%"
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed >> "%LOGFILE%"
        echo ERROR: npm install failed
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Starting services...
echo [%date% %time%] Starting server >> "%LOGFILE%"

REM Start server - window stays open to show all output and errors
echo [1/2] Starting Server (Port 3011)...
start "Kyool Media Server" .run-server.bat

REM Wait for server to initialize
echo   Waiting for server to initialize...
timeout /t 5 /nobreak >nul

echo [%date% %time%] Starting UI >> "%LOGFILE%"

REM Start UI - window stays open to show all output and errors
echo [2/2] Starting UI (Port 3010)...
start "Kyool Media UI" .run-ui.bat

REM Wait for UI
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo   Server: http://localhost:3011
echo   UI:     http://localhost:3010
echo.
echo Logs:
echo   Startup: logs\startup.log
echo   Server:  logs\server.log
echo   UI:      logs\ui.log
echo.
echo To stop: Run STOP.bat or close the console windows
echo.

REM Open browser
echo Opening browser...
start http://localhost:3010

echo [%date% %time%] Startup complete >> "%LOGFILE%"
echo.
echo Press any key to exit this window (services will keep running)
pause >nul
