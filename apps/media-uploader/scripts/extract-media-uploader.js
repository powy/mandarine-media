#!/usr/bin/env node

/**
 * Extract Media Uploader for Distribution
 * Creates a standalone ZIP package that can run independently without Nx
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const outputDir = path.join(rootDir, '..', '..', 'dist', 'standalone');
const packageName = `kyool-media-uploader-standalone.zip`;
const outputPath = path.join(outputDir, packageName);

console.log('========================================');
console.log('Extracting Media Uploader (Standalone)');
console.log('========================================\n');

// Ensure output directory exists
fs.ensureDirSync(outputDir);

// Remove existing package
if (fs.existsSync(outputPath)) {
  console.log(`Removing existing package: ${packageName}`);
  fs.removeSync(outputPath);
}

// Create archive
console.log(`Creating package: ${packageName}\n`);

const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', function() {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);

  console.log('\n========================================');
  console.log('Package Created Successfully!');
  console.log('========================================\n');
  console.log(`File: ${packageName}`);
  console.log(`Size: ${sizeMB} MB`);
  console.log(`Path: ${outputPath}\n`);
  console.log('Contents:');
  console.log('  • media-uploader/ (source code)');
  console.log('  • START.bat (runs server + interface)');
  console.log('  • README.md\n');
  console.log('To use:');
  console.log('  1. Extract ZIP to any folder');
  console.log('  2. Double-click START.bat');
  console.log('  3. Opens browser at http://localhost:3010\n');
});

archive.on('error', function(err) {
  console.error('Error creating package:', err);
  process.exit(1);
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('Warning: File not found:', err.message);
  } else {
    console.warn('Warning:', err);
  }
});

archive.pipe(output);

// Add files to archive
console.log('Adding files to package...');

// Verify src directory exists
const srcDir = path.join(rootDir, 'src');
if (!fs.existsSync(srcDir)) {
  console.error('ERROR: src/ directory not found!');
  console.error(`Expected: ${srcDir}`);
  process.exit(1);
}

// Source code
archive.directory(srcDir, 'media-uploader/src');
console.log('  ✓ Source code');

// Package.json - include ALL runtime dependencies
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const distributionPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: "module",
  description: packageJson.description || "Kyool Media Uploader - Standalone Edition",
  main: "src/index.js",
  engines: packageJson.engines,
  scripts: {
    "model:server": "node src/subtools/service-server/server.js",
    "model:interface": "cd src/subtools/service-interface && npm install && npm run dev",
    "model:start": "concurrently \"npm run model:server\" \"npm run model:interface\""
  },
  dependencies: packageJson.dependencies
};
archive.append(JSON.stringify(distributionPackageJson, null, 2), { name: 'media-uploader/package.json' });
console.log('  ✓ package.json');

// Create START.bat (based on working version from repo)
const startBatchContent = `@echo off
setlocal enabledelayedexpansion

REM ========================================
REM Kyool Media Uploader - START
REM ========================================

echo ========================================
echo Kyool Media Uploader
echo ========================================
echo.

cd /d "%~dp0media-uploader"

REM Create logs directory
if not exist "logs" mkdir logs

REM Log file
set "LOGFILE=logs\\startup.log"
echo [%date% %time%] Starting Kyool Media Uploader >> "%LOGFILE%"

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found! >> "%LOGFILE%"
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js 18+ from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   Node.js version: %NODE_VERSION%
echo [%date% %time%] Node.js: %NODE_VERSION% >> "%LOGFILE%"

REM Kill any existing instances
echo Stopping any existing instances...
taskkill /F /FI "WINDOWTITLE eq Kyool Media Server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Kyool Media UI*" >nul 2>&1
timeout /t 1 /nobreak >nul

REM Check if source files exist
if not exist "src\\subtools\\service-server\\server.js" (
    echo ERROR: Server source not found! >> "%LOGFILE%"
    echo ERROR: Server source files not found
    echo Expected: src\\subtools\\service-server\\server.js
    echo.
    pause
    exit /b 1
)

if not exist "src\\subtools\\service-interface\\package.json" (
    echo ERROR: UI source not found! >> "%LOGFILE%"
    echo ERROR: UI source files not found
    echo Expected: src\\subtools\\service-interface\\package.json
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists (root dependencies)
if not exist "node_modules" (
    echo Installing root dependencies...
    echo [%date% %time%] Running npm install >> "%LOGFILE%"
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed >> "%LOGFILE%"
        echo ERROR: npm install failed
        echo.
        pause
        exit /b 1
    )
    echo Root dependencies installed successfully!
    echo.
)

echo.
echo Starting services...
echo NOTE: UI will install its own dependencies if needed (first run)
echo [%date% %time%] Starting server >> "%LOGFILE%"

REM Start server - window stays open to show all output and errors
echo [1/2] Starting Server (Port 3011)...
start "Kyool Media Server" .run-server.bat

REM Wait for server to initialize
echo   Waiting for server to initialize...
timeout /t 5 /nobreak >nul

echo [%date% %time%] Starting UI >> "%LOGFILE%"

REM Start UI - window stays open to show all output and errors
echo [2/2] Starting UI (Port 3010)...
start "Kyool Media UI" .run-ui.bat

REM Wait for UI
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo   Server: http://localhost:3011
echo   UI:     http://localhost:3010
echo.
echo Logs:
echo   Startup: logs\\startup.log
echo.
echo To stop: Close the console windows or run Ctrl+C in them
echo.

REM Open browser
echo Opening browser...
start http://localhost:3010

echo [%date% %time%] Startup complete >> "%LOGFILE%"
echo.
echo Press any key to exit this window (services will keep running)
pause >nul
`;

archive.append(startBatchContent, { name: 'START.bat' });
console.log('  ✓ START.bat');

// Create .run-server.bat helper
const runServerBatchContent = `@echo off
REM Internal wrapper script to run server with error handling
echo ============================================
echo Kyool Media Server
echo ============================================
echo.
echo Starting server on port 3011...
echo.
echo ============================================
echo.

REM Run server
node src\\subtools\\service-server\\server.js 2>&1

REM Capture exit code
set EXIT_CODE=%errorlevel%

echo.
echo ============================================
if %EXIT_CODE% neq 0 (
    echo ERROR: Server stopped with exit code %EXIT_CODE%
    echo.
    echo This window will stay open so you can see the error.
) else (
    echo Server stopped normally.
)
echo.
echo Press any key to close this window...
echo ============================================
pause >nul
`;

archive.append(runServerBatchContent, { name: 'media-uploader/.run-server.bat' });
console.log('  ✓ .run-server.bat');

// Create .run-ui.bat helper
const runUiBatchContent = `@echo off
REM Internal wrapper script to run UI with error handling
echo ============================================
echo Kyool Media UI (Vite Dev Server)
echo ============================================
echo.
echo Starting UI on port 3010...
echo.
echo ============================================
echo.

REM Check if service-interface dependencies are installed
if not exist "src\\subtools\\service-interface\\node_modules" (
    echo Installing service-interface dependencies...
    cd src\\subtools\\service-interface
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: npm install failed for service-interface!
        echo.
        pause
        exit /b 1
    )
    cd ..\\..\\..
    echo.
)

REM Run Vite dev server (serves source files directly)
cd src\\subtools\\service-interface
call npm run dev 2>&1

REM Capture exit code
set EXIT_CODE=%errorlevel%
cd ..\\..\\..

echo.
echo ============================================
if %EXIT_CODE% neq 0 (
    echo ERROR: UI stopped with exit code %EXIT_CODE%
    echo.
    echo This window will stay open so you can see the error.
) else (
    echo UI stopped normally.
)
echo.
echo Press any key to close this window...
echo ============================================
pause >nul
`;

archive.append(runUiBatchContent, { name: 'media-uploader/.run-ui.bat' });
console.log('  ✓ .run-ui.bat');

// Create README
const readmeContent = `# Kyool Media Uploader - Standalone Edition

A standalone package for uploading media files to Kyool platform.

## Requirements

- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org)
- **Windows** (batch scripts included)

## Quick Start

1. **Extract** this ZIP file to any folder
2. **Double-click** \`START.bat\`
3. **Wait** for dependencies to install (first run only)
4. **Browser opens** automatically at http://localhost:3010

## What START.bat Does

1. Checks if Node.js is installed
2. Installs npm dependencies (first run only)
3. Starts the service server (port 3011)
4. Starts the service interface (port 3010)
5. Opens your browser to the interface

## Troubleshooting

### "Node.js is not installed"
- Download and install Node.js 18+ from https://nodejs.org
- Restart your computer after installation
- Run START.bat again

### "npm install failed"
- Check your internet connection
- Make sure you're not behind a firewall blocking npm
- Try running \`npm install\` manually in the media-uploader folder

### Services won't start
- Check if ports 3010 and 3011 are available
- Look at \`server.log\` and \`interface.log\` for error messages
- Make sure no other instance is running

### Browser doesn't open
- Manually open http://localhost:3010 in your browser
- Wait 10-15 seconds for services to fully start

## Data Storage

The application stores its data in:
\`%APPDATA%\\Kyool\\MediaUploader\`

This includes:
- Database files (tasks.json)
- Log files
- Temporary files

To use local storage instead, set environment variable:
\`set KYOOL_USE_LOCAL=true\`

## Manual Start

If you prefer to start services manually:

\`\`\`bash
cd media-uploader
npm install

# Terminal 1 - Start server
node src/subtools/service-server/server.js

# Terminal 2 - Start interface
cd src/subtools/service-interface
npm install
npm run dev
\`\`\`

## Support

For issues and support, contact the Kyool development team.

## Version

Version ${packageJson.version}
`;

archive.append(readmeContent, { name: 'README.md' });
console.log('  ✓ README.md');

// Finalize
archive.finalize();
