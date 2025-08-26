# Media Analyzer Tool - Windows Guide

This guide helps Windows users install and use the Media Analyzer Tool.

## 🚀 Quick Start

### Option 1: Use Pre-built Windows Installer (Recommended)

1. **Download the installer**: `Media Analyzer Setup 1.0.0.exe` from the `dist` folder
2. **Run the installer**: Double-click the installer file
3. **Follow the setup wizard**: Choose installation directory and options
4. **Launch the application**: Use the desktop shortcut or start menu

### Option 2: Use Portable Version

1. **Extract the portable version**: Copy the `win-unpacked` folder to your desired location
2. **Run the executable**: Double-click `Media Analyzer.exe` in the extracted folder

### Option 3: Run from Source Code

1. **Install Node.js**: Download from [nodejs.org](https://nodejs.org/) (version 16+)
2. **Install dependencies**: Open Command Prompt in the tool folder and run:
   ```cmd
   npm install
   ```
3. **Launch GUI**: Run:
   ```cmd
   npm run gui
   ```
   Or double-click `start-gui.bat`

## 🎬 How to Use

1. **Select your media folders**:
   - Video files folder (required)
   - Subtitle files folder (optional)
   - Image files folder (optional)

2. **Configure analysis options**:
   - ✅ Read video metadata (recommended for complete analysis)
   - ✅ Generate upload format (creates optimized JSON for uploads)

3. **Start analysis**: Click "🚀 Start Analysis"

4. **View results**: The tool will display a human-friendly report and save JSON files

## 📁 Output Files

The tool creates timestamped files:
- `media_analysis_YYYY-MM-DD_HH-MM-SS.json` - Complete analysis results
- `media_analysis_YYYY-MM-DD_HH-MM-SS_upload.json` - Upload-optimized format (if enabled)

## 🛠️ Building from Source

If you want to build the Windows executable yourself:

```cmd
# Install dependencies
npm install

# Build Windows installer
npm run build-win

# Build portable version only
npm run pack
```

The built files will be in the `dist` folder.

## 📋 System Requirements

- **Windows 10 or later**
- **50MB free disk space** (for portable version)
- **100MB free disk space** (during analysis of large media libraries)

## 🔧 Troubleshooting

### "Windows protected your PC" warning
This is normal for unsigned applications. Click "More info" then "Run anyway".

### Application won't start
1. Ensure you have Windows 10 or later
2. Try running as administrator
3. Check Windows Defender/antivirus isn't blocking the app

### FFmpeg not found errors
The tool includes embedded FFmpeg binaries, but if you encounter issues:
1. Try the portable version instead of the installer
2. Disable "Read video metadata" option as a workaround

## 🆘 Support

For issues specific to Windows:
1. Check the console output by running from Command Prompt
2. Ensure all dependencies are correctly installed
3. Try the CLI version: `npm start -- --help`