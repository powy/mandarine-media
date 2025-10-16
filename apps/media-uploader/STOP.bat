@echo off
setlocal

REM ========================================
REM Kyool Media Uploader - STOP
REM ========================================

echo ========================================
echo Stopping Kyool Media Uploader
echo ========================================
echo.

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Log file
set "LOGFILE=logs\startup.log"
echo [%date% %time%] Stopping services >> "%LOGFILE%"

REM Kill UI
echo Stopping UI...
taskkill /F /FI "WINDOWTITLE eq Kyool Media UI*" >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ UI stopped
    echo [%date% %time%] UI stopped >> "%LOGFILE%"
) else (
    echo   ⚠ UI was not running
    echo [%date% %time%] UI was not running >> "%LOGFILE%"
)

REM Wait a bit
timeout /t 1 /nobreak >nul

REM Kill Server
echo Stopping Server...
taskkill /F /FI "WINDOWTITLE eq Kyool Media Server*" >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ Server stopped
    echo [%date% %time%] Server stopped >> "%LOGFILE%"
) else (
    echo   ⚠ Server was not running
    echo [%date% %time%] Server was not running >> "%LOGFILE%"
)

REM Also try to kill any node processes running our scripts
echo.
echo Checking for any remaining node processes...
for /f "tokens=2" %%a in ('tasklist ^| findstr /i "node.exe"') do (
    wmic process where "ProcessId=%%a" get CommandLine 2^>nul | findstr /i "service-server\|service-interface" >nul
    if !errorlevel! equ 0 (
        echo   Killing orphaned node process %%a
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo.
echo ========================================
echo Services Stopped!
echo ========================================
echo.
echo [%date% %time%] Stop complete >> "%LOGFILE%"
pause
