# Media Uploader - How to Start (Unified Dependencies)

This document provides commands to start each tool within the media uploader project using the new unified dependency system.

## Navigation

All commands should be run from the main media-uploader directory:
```bash
cd "C:\GitHub\kftv-kyool\kyool-media\apps\media-uploader"
```

## Installation

Install all dependencies once at the root level:
```bash
npm install
```

## Available Subtools

### 1. Server
**Location:** `src/subtools/server`
**Description:** HTTP server for media uploader tool commands

```bash
# Start server (from root directory)
npm run server:start

# Start server in development mode
npm run server:dev
```

### 2. Excel Batch Editor
**Location:** `src/subtools/excel-batch-editor`
**Description:** Batch Excel file editor for updating specific fields across multiple files

```bash
# Run the tool directly (from root directory)
node src/subtools/excel-batch-editor/index.js [options]
```

### 3. Media Analyzer
**Location:** `src/subtools/media-analyzer`
**Description:** Media file analyzer with metadata extraction and structure detection

```bash
# Run CLI tool directly (from root directory)
node src/subtools/media-analyzer/index.js [options]

# Run GUI version
node src/subtools/media-analyzer/gui.js
```

### 4. Mux Upload
**Location:** `src/subtools/mux-upload`
**Description:** Video upload service to Mux with chunked uploads and resume capabilities

```bash
# Run the tool directly (from root directory)
node src/subtools/mux-upload/index.js [options]
```

### 5. Mux Subtitle Upload
**Location:** `src/subtools/mux-subtitle-upload`
**Description:** Subtitle upload service to Mux videos with format validation and track management

```bash
# Run the tool directly (from root directory)
node src/subtools/mux-subtitle-upload/index.js [options]
```

### 6. One Media Complete Upload
**Location:** `src/subtools/one-media-complete-upload`
**Description:** Complete media upload orchestration service with Excel integration and automated workflows

```bash
# Run the tool directly (from root directory)
node src/subtools/one-media-complete-upload/wrapper.js [options]

# Or use the main index file
node src/subtools/one-media-complete-upload/index.js [options]
```

### 7. Picture Upload
**Location:** `src/subtools/picture-upload`
**Description:** Picture upload service to S3 with image processing and metadata extraction

```bash
# Run the tool directly (from root directory)
node src/subtools/picture-upload/index.js [options]
```

### 8. Uploader in Browser
**Location:** `src/subtools/uploader-in-browser`
**Description:** React-based web interface for media uploading

**Note:** This tool maintains its own dependencies as it's a React/TypeScript frontend.

```bash
# Navigate to the React app directory
cd "C:\GitHub\kftv-kyool\kyool-media\apps\media-uploader\src\subtools\uploader-in-browser"

# Install React-specific dependencies (separate from main app)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 9. Upload GUI (Electron)
**Location:** `src/subtools/upload-gui`
**Description:** Electron-based GUI for media upload tools with drag-and-drop interface

```bash
# Start Electron GUI (from root directory)
npm run gui:electron

# Start in development mode
npm run gui:electron:dev

# Note: Building Electron apps requires additional setup
# Use Tauri build instead: npm run build
```

## Testing Commands

Run all tests from the root directory using unified dependencies:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:watch
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## Notes

- All tools require Node.js >= 18.0.0
- **New Unified Dependencies:** Install dependencies once at the root level with `npm install`
- **No More Individual Installs:** Individual subtool directories no longer have separate package.json files
- Server provides API endpoints and can be started with `npm run server:start`
- Some tools may require additional configuration (environment variables, database setup, etc.)
- Check individual tool documentation for specific usage instructions and configuration requirements

## Migration from Old Structure

If you previously used individual subtool installations:

1. **Remove old node_modules**: Delete any node_modules directories in subtool folders
2. **Install at root**: Run `npm install` in the main media-uploader directory
3. **Use new commands**: Use the commands listed above instead of navigating to individual directories
4. **Server integration**: Use `npm run server:start` for the HTTP server interface

## Available NPM Scripts

```bash
npm run server:start        # Start HTTP server
npm run server:dev          # Start server in development mode
npm run gui:electron        # Start Electron GUI
npm run gui:electron:dev    # Start Electron GUI in dev mode
npm run build               # Build Tauri application
npm run dev                 # Start Tauri in development mode
npm test                    # Run test suite
npm run test:unit           # Run unit tests
npm run test:integration    # Run integration tests
npm run lint                # Run ESLint
npm run lint:fix            # Fix ESLint issues automatically
```