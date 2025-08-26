const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const MediaAnalyzer = require('./src/index');
const Config = require('./src/config');

class MediaAnalyzerGUI {
    constructor() {
        this.mainWindow = null;
        this.analyzer = new MediaAnalyzer(new Config());
        this.currentAnalysis = null;
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 900,
            height: 700,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'src', 'preload.js')
            },
            title: 'Media Analyzer Tool'
        });

        this.mainWindow.loadFile(path.join(__dirname, 'src', 'gui.html'));

        // Optional: Open DevTools in development
        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.webContents.openDevTools();
        }
    }

    setupIPC() {
        // Handle folder selection
        ipcMain.handle('select-folder', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openDirectory']
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                return result.filePaths[0];
            }
            return null;
        });

        // Handle analysis start
        ipcMain.handle('start-analysis', async (event, paths, options) => {
            try {
                // Reset progress
                this.mainWindow.webContents.send('analysis-progress', { 
                    stage: 'starting',
                    message: 'Initializing analysis...',
                    progress: 0
                });

                // Start analysis with progress updates
                const result = await this.analyzeWithProgress(paths, options);
                
                return {
                    success: true,
                    result: result,
                    outputFile: this.currentOutputFile
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }

    async analyzeWithProgress(paths, options = {}) {
        try {
            const self = this;
            
            // Create analyzer
            const analyzer = new MediaAnalyzer(new Config());
            
            // Generate output file with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const outputFile = `media_analysis_${timestamp}.json`;
            this.currentOutputFile = outputFile;

            // Send progress updates
            this.mainWindow.webContents.send('analysis-progress', { 
                stage: 'scanning',
                message: 'Scanning files...',
                progress: 20
            });

            this.mainWindow.webContents.send('analysis-progress', { 
                stage: 'detecting',
                message: 'Detecting structure and media type...',
                progress: 40
            });

            this.mainWindow.webContents.send('analysis-progress', { 
                stage: 'associating',
                message: 'Creating file associations...',
                progress: 70
            });

            this.mainWindow.webContents.send('analysis-progress', { 
                stage: 'formatting',
                message: 'Formatting results...',
                progress: 90
            });

            // Run analysis
            const result = await analyzer.analyze(paths, options);
            
            // Save JSON with timestamp
            await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf8');
            
            this.mainWindow.webContents.send('analysis-progress', { 
                stage: 'complete',
                message: 'Analysis completed!',
                progress: 100
            });
            
            return result;
            
        } catch (error) {
            this.mainWindow.webContents.send('analysis-progress', { 
                stage: 'error',
                message: `Error: ${error.message}`,
                progress: 0
            });
            throw error;
        }
    }

    init() {
        app.whenReady().then(() => {
            this.createWindow();
            this.setupIPC();
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });
    }
}

// Start the GUI
const gui = new MediaAnalyzerGUI();
gui.init();

module.exports = MediaAnalyzerGUI;