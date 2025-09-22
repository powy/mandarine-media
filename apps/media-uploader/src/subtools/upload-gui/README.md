# Media Upload GUI

A graphical user interface for the media upload workflow, providing an easy-to-use alternative to command-line operations.

## Overview

The Upload GUI provides a Windows-compatible desktop application that simplifies the media upload process by offering:

- **Visual folder selection** with browse dialog
- **Two-step workflow**: Prepare Excel and Execute Upload buttons
- **Real-time log display** with auto-scroll functionality
- **Configuration management** via INI files
- **Status indicators** showing current operation state

## Quick Start

### 1. Launch GUI
```bash
# From the media-uploader directory
npm run start gui

# Or directly
node src/subtools/upload-gui/index.js
```

### 2. Create Configuration
```bash
# Create a sample config file
npm run start gui --create-config

# Or with custom path
npm run start gui --config my-config.ini --create-config
```

### 3. Edit Configuration
Edit the generated `config.ini` file with your credentials:

```ini
[backend]
baseUrl=https://your-api.com
username=your-username
password=your-password

[mux]
tokenId=your-mux-token-id
tokenSecret=your-mux-token-secret

[s3]
accessKeyId=your-access-key
secretAccessKey=your-secret-key
region=us-east-1

[s3.pictures]
bucket=your-pictures-bucket
keyPrefix=pictures/
```

## Usage Workflow

### Step 1: Select Folder
1. Click **Browse...** button
2. Select folder containing your media files
3. The folder path will be displayed

### Step 2: Prepare Excel
1. Click **Prepare Excel** button
2. Wait for the process to complete
3. Review the auto-generated Excel file
4. Fill in the Description sheet manually

### Step 3: Execute Upload
1. Ensure Excel file is properly filled
2. Click **Execute Upload** button
3. Monitor progress in the log window
4. Wait for completion confirmation

## Features

### GUI Components
- **Header**: Shows app title and current config file
- **Folder Selection**: Input field and browse button
- **Action Buttons**: Prepare Excel and Execute Upload
- **Status Bar**: Shows current operation and progress
- **Log Window**: Real-time output with level-based coloring

### Log Features
- **Auto-scroll**: Automatically scrolls to latest messages
- **Level Colors**: Info (blue), success (green), warning (yellow), error (red)
- **Clear Function**: Clears log history
- **Timestamp**: Each message includes timestamp

### Configuration Management
- **INI Format**: Human-readable configuration files
- **Validation**: Checks required fields on startup
- **Reloading**: Can switch config files during runtime
- **Sample Creation**: Built-in template generator

## Architecture

### File Structure
```
upload-gui/
├── index.js              # Main entry point
├── main.js               # Electron main process
├── preload.js            # Electron preload script
├── renderer.js           # Frontend JavaScript
├── gui.html              # HTML layout
├── styles.css            # CSS styles
├── wrapper.js            # CLI integration
├── config.ini            # Default configuration
├── config/
│   └── configReader.js   # INI parser
└── services/
    └── uploadService.js  # Upload logic wrapper
```

### Technology Stack
- **Electron**: Desktop app framework
- **HTML/CSS/JavaScript**: Frontend technologies
- **Node.js**: Backend logic
- **INI**: Configuration file format

## Command Line Options

```bash
# Basic usage
node index.js

# Custom config path
node index.js --config /path/to/config.ini

# Create sample configuration
node index.js --create-config

# Verbose output
node index.js --verbose

# Show help
node index.js --help
```

## Integration

### From Main CLI
```bash
# Launch GUI
media-uploader gui

# With custom config
media-uploader gui --config config.ini

# Create sample config
media-uploader gui --create-config
```

### Programmatic Usage
```javascript
import { launchUploadGUI } from './wrapper.js';

await launchUploadGUI({
  config: './my-config.ini',
  verbose: true
});
```

## Configuration Reference

### Required Sections

#### [backend]
- `baseUrl`: API server URL
- `username`: API username
- `password`: API password

#### [mux]
- `tokenId`: Mux API token ID
- `tokenSecret`: Mux API token secret

#### [s3]
- `accessKeyId`: AWS access key
- `secretAccessKey`: AWS secret key
- `region`: AWS region (default: us-east-1)

#### [s3.pictures]
- `bucket`: S3 bucket for images
- `keyPrefix`: S3 key prefix (default: pictures/)

### Optional Sections

#### [general]
- `verbose`: Enable verbose logging (default: true)

#### [logging]
- `enabled`: Enable logging (default: true)
- `level`: Log level (default: info)
- `file`: Log file path (default: ./upload-gui.log)
- `console`: Console logging (default: true)

## Troubleshooting

### Common Issues

**GUI won't start**
- Ensure Electron is installed: `npm install`
- Check Node.js version: requires Node 18+

**Config validation fails**
- Verify all required fields are filled
- Check for typos in section names
- Ensure no trailing spaces in values

**Upload fails**
- Verify folder contains media files
- Check Excel file is properly filled
- Confirm API credentials are correct

### Debug Mode
Run with verbose flag for detailed logging:
```bash
node index.js --verbose
```

### Log Files
Check the log file for detailed error information:
- Default location: `./upload-gui.log`
- Configurable via `[logging] file` setting

## Dependencies

- **electron**: Desktop application framework
- **Node.js modules**: From parent media-uploader package
- **one-complete-upload**: Core upload functionality

## Development

### Running in Development
```bash
# Set development mode
export NODE_ENV=development
node index.js
```

This will open DevTools for debugging the renderer process.

### File Watching
The GUI automatically reloads configuration changes. For code changes, restart the application.

## Support

For issues or questions about the GUI:
1. Check the log output for detailed error messages
2. Verify configuration file syntax
3. Ensure all dependencies are installed
4. Test with the CLI version first to isolate GUI-specific issues