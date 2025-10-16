@echo off
REM Internal wrapper script to run server with error handling
echo ============================================
echo Kyool Media Server
echo ============================================
echo.
echo Starting server on port 3011...
echo Output is shown below AND logged to logs\server.log
echo.
echo ============================================
echo.

REM Run server - output to both console and log file
node src\subtools\service-server\server.js 2>&1

REM Capture exit code
set EXIT_CODE=%errorlevel%

echo.
echo ============================================
if %EXIT_CODE% neq 0 (
    echo ERROR: Server stopped with exit code %EXIT_CODE%
    echo.
    echo This window will stay open so you can see the error.
    echo Check logs\server.log for full details.
) else (
    echo Server stopped normally.
)
echo.
echo Press any key to close this window...
echo ============================================
pause >nul
