@echo off
echo ========================================
echo Stopping Kyool Media Uploader
echo ========================================
echo.

echo Stopping UI...
taskkill /F /IM media-uploader-ui.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ UI stopped
) else (
    echo   ⚠ UI was not running
)

echo Stopping server...
taskkill /F /IM media-uploader-server.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ Server stopped
) else (
    echo   ⚠ Server was not running
)

echo.
echo ========================================
echo Services Stopped!
echo ========================================
echo.
pause
