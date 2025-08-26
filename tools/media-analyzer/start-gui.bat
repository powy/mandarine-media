@echo off
REM Media Analyzer GUI Launcher Script for Windows

echo.
echo 🎬 Starting Media Analyzer GUI...
echo This tool will help you analyze and organize your media files.
echo.

REM Launch the GUI
set ELECTRON_ENABLE_LOGGING=1
npm run gui

echo.
echo GUI application closed.
pause