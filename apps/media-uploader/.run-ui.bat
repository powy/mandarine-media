@echo off
REM Internal wrapper script to run UI with error handling
echo ============================================
echo Kyool Media UI
echo ============================================
echo.
echo Starting UI on port 3010...
echo Output is shown below AND logged to logs\ui.log
echo.
echo ============================================
echo.

REM Run UI - output to both console and log file
node src\subtools\service-interface\serve.js 2>&1

REM Capture exit code
set EXIT_CODE=%errorlevel%

echo.
echo ============================================
if %EXIT_CODE% neq 0 (
    echo ERROR: UI stopped with exit code %EXIT_CODE%
    echo.
    echo This window will stay open so you can see the error.
    echo Check logs\ui.log for full details.
) else (
    echo UI stopped normally.
)
echo.
echo Press any key to close this window...
echo ============================================
pause >nul
