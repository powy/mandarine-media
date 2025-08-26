# Media Analyzer GUI

A graphical user interface for the Media Analyzer Tool, built with Electron for cross-platform compatibility.

## Features

- 📁 **Path Selection**: Easy folder selection with browse dialogs for video, subtitle, and image files
- 🔍 **File Explorer Integration**: Native file browser integration for selecting input folders  
- ⚡ **Progress Tracking**: Real-time progress bar showing analysis stages
- 📊 **Human-Friendly Reports**: Scrollable, formatted analysis results with statistics
- 📋 **Detailed Results**: Shows file associations, metadata, unmatched files, and more
- ⏰ **Timestamped Exports**: JSON files include generation timestamps
- ✕ **Always Accessible Close**: Close button always available for report viewing

## Requirements

- Node.js (v14 or higher)
- Electron (automatically installed as dev dependency)
- Graphical environment (X11 on Linux, GUI on Windows/macOS)

## Installation

The GUI dependencies are automatically installed when you run:

```bash
npm install
```

## Usage

### Launch GUI
```bash
# Method 1: Using npm script
npm run gui

# Method 2: Using the startup script (Linux/macOS)
./start-gui.sh

# Method 3: Direct electron command
electron --no-sandbox main.js
```

### Using the GUI

1. **Select Input Paths**: 
   - Click "Browse" buttons to select folders containing your media files
   - You can specify separate folders for videos, subtitles, and images
   - At least one path is required to start analysis

2. **Configure Options**:
   - ✅ **Read video metadata**: Extracts detailed video information (slower but more complete)
   - ✅ **Generate upload format**: Creates an additional upload-optimized JSON file

3. **Start Analysis**:
   - Click "🚀 Start Analysis" to begin processing
   - Watch the progress bar for real-time updates
   - Progress shows current stage and completion percentage

4. **View Results**:
   - Human-friendly report appears after analysis completion
   - Shows summary statistics, detected languages, media items, and file associations
   - Scrollable interface for long results
   - "✕ Close Report" button always accessible

5. **Output Files**:
   - JSON file saved with timestamp: `media_analysis_YYYY-MM-DD_HH-MM-SS.json`
   - Optional upload format file: `media_analysis_YYYY-MM-DD_HH-MM-SS_upload.json`

## Cross-Platform Notes

### Linux
- Requires X11 graphical environment
- Use `--no-sandbox` flag for Electron (included in npm script)
- GPU acceleration warnings are normal in virtualized environments

### Windows
- Native folder dialogs
- Should work out-of-the-box with Node.js and npm installed

### macOS
- Native file dialogs
- May require allowing app permissions in Security & Privacy settings

## Troubleshooting

### "SUID sandbox helper binary" error on Linux
This is automatically handled by the `--no-sandbox` flag in the npm script.

### "No display detected" 
Ensure you have a graphical environment available. For SSH connections, use X11 forwarding:
```bash
ssh -X username@hostname
```

### GPU process errors
These warnings are normal in headless or virtualized environments and don't affect functionality.

### Electron won't start
Make sure all dependencies are installed:
```bash
npm install
```

## Development

The GUI consists of:
- `main.js`: Electron main process (backend)
- `src/gui.html`: Main interface layout
- `src/gui.css`: Styling and responsive design
- `src/gui-frontend.js`: Frontend JavaScript logic
- `src/preload.js`: Secure bridge between main and renderer processes

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Main Process   │    │ Media Analyzer  │
│   (Renderer)    │◄──►│   (Electron)     │◄──►│    Engine       │
│                 │    │                  │    │                 │
│ • User Input    │    │ • File Dialogs   │    │ • File Scanning │
│ • Progress UI   │    │ • IPC Handling   │    │ • Analysis      │
│ • Results View  │    │ • Progress Relay │    │ • Output Format │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

The GUI maintains the same analysis capabilities as the CLI tool while providing an intuitive visual interface.