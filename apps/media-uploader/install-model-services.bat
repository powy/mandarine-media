@echo off
echo ========================================
echo Installing Model Uploader Services...
echo ========================================
echo.

:: Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

:: Get script directory
set "SCRIPT_DIR=%~dp0"

:: Navigate to service-server
echo Installing Service-Server...
cd /d "%SCRIPT_DIR%src\subtools\service-server"

:: Create required directories
echo Creating directories...
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "temp" mkdir temp

:: Initialize database
echo Initializing database...
node db\init-db.js
if %errorlevel% neq 0 (
    echo ERROR: Database initialization failed
    pause
    exit /b 1
)

echo Service-Server setup complete!
echo.

:: Navigate to service-interface
echo Installing Service-Interface...
cd /d "%SCRIPT_DIR%src\subtools\service-interface"

:: Install dependencies
echo Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo Service-Interface setup complete!
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To start the services, run:
echo   start-model-uploader.bat
echo.
echo Or use individual commands:
echo   Service Server:    node src\subtools\service-server\server.js
echo   Service Interface: npm run dev (from service-interface folder)
echo.
pause
