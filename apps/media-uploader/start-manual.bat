@echo off
echo ========================================
echo Starting Kyool Media Uploader
echo ========================================
echo.

REM Kill any existing instances
taskkill /F /IM media-uploader-server.exe >nul 2>&1
taskkill /F /IM media-uploader-ui.exe >nul 2>&1

REM Start server in background
echo Starting server (Port 3011)...
start "Kyool Media Server" /MIN cmd /c "media-uploader-server.exe"

REM Wait for server to initialize
timeout /t 3 /nobreak >nul

REM Start UI in background
echo Starting UI (Port 3010)...
start "Kyool Media UI" /MIN cmd /c "media-uploader-ui.exe"

REM Wait a bit
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo Access the UI at: http://localhost:3010
echo.
echo To stop: Run stop-manual.bat or close the windows
echo.

REM Open browser
start http://localhost:3010

pause
