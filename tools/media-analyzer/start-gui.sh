#!/bin/bash
# Media Analyzer GUI Launcher Script

echo "🎬 Starting Media Analyzer GUI..."
echo "This tool will help you analyze and organize your media files."
echo ""

# Check if we're running in a headless environment
if [ -z "$DISPLAY" ]; then
    echo "⚠️  Warning: No display detected (DISPLAY variable not set)"
    echo "This GUI application requires a graphical environment."
    echo ""
    echo "If you're using SSH, try connecting with X11 forwarding:"
    echo "  ssh -X username@hostname"
    echo ""
    echo "Or use the CLI version instead:"
    echo "  npm start"
    exit 1
fi

# Launch the GUI
export ELECTRON_ENABLE_LOGGING=1
npm run gui

echo ""
echo "GUI application closed."