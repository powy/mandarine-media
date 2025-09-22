const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// __dirname is available in CommonJS
const __dirname_actual = __dirname;

/**
 * Resolve wrapper script path for both development and production environments
 */
function resolveWrapperPath(relativePath) {
  // Try the normal relative path first
  const normalPath = path.resolve(__dirname_actual, relativePath);
  if (fs.existsSync(normalPath)) {
    return normalPath;
  }

  // For production builds, try alternative path structures
  const productionPaths = [
    // Tauri bundled structure
    path.resolve(process.resourcesPath || process.cwd(), 'src', 'subtools', relativePath.replace('../', '')),
    // Alternative bundled path - this is where Tauri actually puts files
    path.resolve(process.cwd(), '_up_', 'src', 'subtools', relativePath.replace('../', '')),
    // Current working directory relative
    path.resolve(process.cwd(), 'src', 'subtools', relativePath.replace('../', '')),
    // Fallback to development-style path in bundle
    path.resolve(process.cwd(), 'kyool-media', 'apps', 'media-uploader', 'src', 'subtools', relativePath.replace('../', ''))
  ];

  for (const testPath of productionPaths) {
    if (fs.existsSync(testPath)) {
      console.log(`🔍 Using wrapper from: ${testPath}`);
      return testPath;
    }
  }

  console.warn(`⚠️  Wrapper not found, using original path: ${normalPath}`);
  return normalPath;
}

// Dynamic imports for ES modules
let UploadService, ConfigReader;
async function loadModules() {
  console.log('🔍 DEBUG: loadModules called - importing modules...');
  const uploadServiceModule = await import('./services/uploadService.js');
  const configReaderModule = await import('./config/configReader.js');
  UploadService = uploadServiceModule.UploadService;
  ConfigReader = configReaderModule.ConfigReader;
  console.log('🔍 DEBUG: Modules loaded successfully!');
  console.log('🔍 DEBUG: UploadService:', UploadService?.name);
}

class UploadGUIMain {
  constructor(options = {}) {
    this.window = null;
    this.uploadService = null;
    this.configPath = options.config || process.env.GUI_CONFIG_PATH || path.join(process.cwd(), 'config.ini');
    this.config = null;

    this.initialize();
  }

  async initialize() {
    await loadModules();
    await app.whenReady();
    await this.loadConfiguration();
    this.createWindow();
    this.setupIPC();
  }

  async loadConfiguration() {
    try {
      // Try to load config if it exists
      if (fs.existsSync(this.configPath)) {
        this.config = ConfigReader.readConfig(this.configPath);
        this.uploadService = new UploadService(this.config, (message) => {
          // Send log messages to renderer
          if (this.window) {
            this.window.webContents.send('log-message', message);
          }
        });
        console.log(`Configuration loaded from: ${this.configPath}`);
      } else {
        // Don't create default config - let user choose
        console.log('No configuration found - GUI will prompt for config');
        this.config = null;
        this.uploadService = null;
      }
    } catch (error) {
      console.error('Invalid configuration:', error.message);
      // Re-throw error so caller knows config loading failed
      throw new Error(`Configuration error: ${error.message}`);
    }
  }

  async createDefaultConfig() {
    const defaultConfig = `# Media Upload GUI Configuration
# Edit this file to configure your upload settings

[general]
verbose=true

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

[logging]
enabled=true
level=info
file=./upload-gui.log
console=true
`;

    fs.writeFileSync(this.configPath, defaultConfig);
    console.log(`Created default configuration at: ${this.configPath}`);
  }

  createWindow() {
    this.window = new BrowserWindow({
      width: 1000,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname_actual, 'preload.js')
      },
      titleBarStyle: 'default',
      icon: null, // Add app icon if available
      show: false // Don't show until ready
    });

    // Load the HTML file
    this.window.loadFile(path.join(__dirname_actual, 'gui.html'));

    // Show window when ready
    this.window.once('ready-to-show', () => {
      this.window.show();

      // Send initial config info to renderer
      this.window.webContents.send('config-loaded', {
        configPath: this.configPath,
        isValid: this.config !== null && Object.keys(this.config).length > 0
      });
    });

    // Handle window closed
    this.window.on('closed', () => {
      this.window = null;
    });

    // Development: Open DevTools
    if (process.env.NODE_ENV === 'development') {
      this.window.webContents.openDevTools();
    }
  }

  setupIPC() {
    // Handle folder selection
    ipcMain.handle('select-folder', async () => {
      const result = await dialog.showOpenDialog(this.window, {
        properties: ['openDirectory'],
        title: 'Select Media Folder',
        buttonLabel: 'Select Folder'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] };
      } else {
        return { success: false, path: null };
      }
    });

    // Handle path validation
    ipcMain.handle('validate-path', async (event, inputPath) => {
      try {
        if (!inputPath || typeof inputPath !== 'string') {
          return {
            success: false,
            exists: false,
            isDirectory: false,
            error: 'Invalid path input'
          };
        }

        const trimmedPath = inputPath.trim();
        if (!trimmedPath) {
          return {
            success: false,
            exists: false,
            isDirectory: false,
            error: 'Empty path'
          };
        }

        // Check if path exists
        const exists = fs.existsSync(trimmedPath);
        if (!exists) {
          return {
            success: false,
            exists: false,
            isDirectory: false,
            error: 'Path does not exist'
          };
        }

        // Check if path is a directory
        const stats = fs.statSync(trimmedPath);
        const isDirectory = stats.isDirectory();

        if (!isDirectory) {
          return {
            success: false,
            exists: true,
            isDirectory: false,
            error: 'Path is not a directory'
          };
        }

        return {
          success: true,
          exists: true,
          isDirectory: true,
          path: trimmedPath
        };

      } catch (error) {
        return {
          success: false,
          exists: false,
          isDirectory: false,
          error: error.message
        };
      }
    });

    // Handle Excel preparation
    ipcMain.handle('prepare-excel', async (event, folderPath) => {
      try {
        if (!this.uploadService) {
          throw new Error('Upload service not initialized. Check configuration.');
        }

        this.sendLogMessage('info', 'Starting Excel preparation...');
        const result = await this.uploadService.prepareExcel(folderPath);

        if (result.success) {
          this.sendLogMessage('success', `Excel preparation completed: ${result.message}`);
          if (result.excelPath) {
            this.sendLogMessage('info', `Excel file: ${result.excelPath}`);
          }
        } else {
          this.sendLogMessage('error', `Excel preparation failed: ${result.error}`);
        }

        return result;
      } catch (error) {
        const errorMessage = `Excel preparation error: ${error.message}`;
        this.sendLogMessage('error', errorMessage);
        return {
          success: false,
          error: errorMessage,
          phase: 'preparation-error'
        };
      }
    });

    // Handle upload execution
    ipcMain.handle('execute-upload', async (event, folderPath) => {
      try {
        if (!this.uploadService) {
          throw new Error('Upload service not initialized. Check configuration.');
        }

        this.sendLogMessage('info', 'Starting upload execution...');
        const result = await this.uploadService.executeUpload(folderPath);

        if (result.success) {
          this.sendLogMessage('success', `Upload completed successfully: ${result.message}`);
          if (result.mediaDescriptionId) {
            this.sendLogMessage('info', `Media Description ID: ${result.mediaDescriptionId}`);
          }
        } else {
          this.sendLogMessage('error', `Upload failed: ${result.error}`);
        }

        return result;
      } catch (error) {
        const errorMessage = `Upload execution error: ${error.message}`;
        this.sendLogMessage('error', errorMessage);
        return {
          success: false,
          error: errorMessage,
          phase: 'upload-error'
        };
      }
    });

    // Handle Excel bulk edit
    ipcMain.handle('excel-bulk-edit', async (event, folderPath, fieldName, fieldValue, dryRun) => {
      try {
        // Import the batchUpdateExcel function
        const wrapperPath = resolveWrapperPath('../excel-batch-editor/wrapper.js');
        // Use pathToFileURL for proper Windows compatibility
        const { pathToFileURL } = require('url');
        const moduleURL = pathToFileURL(wrapperPath).href;
        console.log(`🔍 Importing excel-batch-editor from URL: ${moduleURL}`);
        const { batchUpdateExcel } = await import(moduleURL);

        // Create a logger that sends messages to the renderer
        const logger = {
          info: (msg) => {
            if (this.window) {
              this.window.webContents.send('log-message', {
                timestamp: new Date().toLocaleTimeString(),
                level: 'info',
                message: msg
              });
            }
          },
          warn: (msg) => {
            if (this.window) {
              this.window.webContents.send('log-message', {
                timestamp: new Date().toLocaleTimeString(),
                level: 'warn',
                message: msg
              });
            }
          },
          error: (msg) => {
            if (this.window) {
              this.window.webContents.send('log-message', {
                timestamp: new Date().toLocaleTimeString(),
                level: 'error',
                message: msg
              });
            }
          }
        };

        // Execute the bulk edit with proper options and custom logger
        const result = await batchUpdateExcel({
          folder: folderPath,
          field: fieldName,
          value: fieldValue,
          pattern: '0_desc',
          dryRun: dryRun,
          verbose: true,
          customLogger: logger
        });

        return result;

      } catch (error) {
        const errorMessage = error.message || 'Unknown error during Excel bulk edit';
        console.error('Excel bulk edit error:', error);

        if (this.window) {
          this.window.webContents.send('log-message', {
            timestamp: new Date().toLocaleTimeString(),
            level: 'error',
            message: `❌ Excel bulk edit failed: ${errorMessage}`
          });
        }

        return {
          success: false,
          error: errorMessage
        };
      }
    });

    // Handle config reload
    ipcMain.handle('reload-config', async () => {
      try {
        await this.loadConfiguration();
        return {
          success: true,
          configPath: this.configPath,
          isValid: this.config !== null && Object.keys(this.config).length > 0
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Handle config path selection
    ipcMain.handle('select-config', async () => {
      const result = await dialog.showOpenDialog(this.window, {
        properties: ['openFile'],
        title: 'Select Configuration File',
        buttonLabel: 'Select Config',
        filters: [
          { name: 'Configuration Files', extensions: ['ini', 'conf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        this.configPath = result.filePaths[0];
        try {
          await this.loadConfiguration();
          return {
            success: true,
            configPath: this.configPath,
            isValid: this.config !== null && this.uploadService !== null
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            configPath: this.configPath
          };
        }
      } else {
        return { success: false };
      }
    });

    // Handle batch Excel preparation
    ipcMain.handle('prepare-excel-batch', async (event, parentFolderPath) => {
      console.log('🔍 DEBUG: IPC Handler prepare-excel-batch called!');
      console.log('🔍 DEBUG: parentFolderPath:', parentFolderPath);
      try {
        this.sendLogMessage('info', `🔧 IPC Handler: prepare-excel-batch called with path: ${parentFolderPath}`);

        // Check service initialization
        if (!this.uploadService) {
          this.sendLogMessage('error', '❌ Upload service not initialized. Check configuration.');
          return {
            success: false,
            error: 'Upload service not initialized. Check configuration.',
            processedCount: 0,
            totalSubfolders: 0
          };
        }

        this.sendLogMessage('info', `✅ Upload service is initialized: ${this.uploadService.constructor.name}`);
        this.sendLogMessage('info', `📁 Starting batch Excel preparation for subfolders in: ${parentFolderPath}`);

        const result = await this.uploadService.prepareExcelBatch(parentFolderPath);

        this.sendLogMessage('info', `📊 Raw result from prepareExcelBatch: ${JSON.stringify(result, null, 2)}`);

        if (result.success) {
          this.sendLogMessage('success', `✅ Batch Excel preparation completed: ${result.processedCount}/${result.totalSubfolders} successful`);
          if (result.failedFolders && result.failedFolders.length > 0) {
            this.sendLogMessage('warning', `⚠️ Failed folders: ${result.failedFolders.join(', ')}`);
          }
        } else {
          this.sendLogMessage('error', `❌ Batch Excel preparation failed: ${result.error}`);
        }

        this.sendLogMessage('info', `🔄 Returning result to renderer: ${JSON.stringify(result, null, 2)}`);
        return result;
      } catch (error) {
        const errorMessage = `Batch Excel preparation error: ${error.message}`;
        this.sendLogMessage('error', errorMessage);
        return {
          success: false,
          error: errorMessage,
          processedCount: 0,
          totalSubfolders: 0
        };
      }
    });

    // Handle batch upload execution
    ipcMain.handle('execute-upload-batch', async (event, parentFolderPath) => {
      try {
        if (!this.uploadService) {
          throw new Error('Upload service not initialized. Check configuration.');
        }

        this.sendLogMessage('info', `Starting batch upload execution for subfolders in: ${parentFolderPath}`);
        const result = await this.uploadService.executeUploadBatch(parentFolderPath);

        if (result.success) {
          this.sendLogMessage('success', `Batch upload completed: ${result.processedCount}/${result.totalSubfolders} successful`);
          if (result.failedFolders && result.failedFolders.length > 0) {
            this.sendLogMessage('warning', `Failed folders: ${result.failedFolders.join(', ')}`);
          }
        } else {
          this.sendLogMessage('error', `Batch upload failed: ${result.error}`);
        }

        return result;
      } catch (error) {
        const errorMessage = `Batch upload execution error: ${error.message}`;
        this.sendLogMessage('error', errorMessage);
        return {
          success: false,
          error: errorMessage,
          processedCount: 0,
          totalSubfolders: 0
        };
      }
    });

    // Handle parallel batch upload execution
    ipcMain.handle('execute-upload-batch-parallel', async (event, parentFolderPath, maxConcurrent) => {
      try {
        if (!this.uploadService) {
          throw new Error('Upload service not initialized. Check configuration.');
        }

        this.sendLogMessage('info', `Starting parallel batch upload execution for subfolders in: ${parentFolderPath}`);
        const result = await this.uploadService.executeUploadBatchParallel(parentFolderPath, maxConcurrent);

        if (result.success) {
          this.sendLogMessage('success', `Parallel batch upload started: ${result.message}`);
        } else {
          this.sendLogMessage('error', `Parallel batch upload failed: ${result.error}`);
        }

        return result;
      } catch (error) {
        const errorMessage = `Parallel batch upload execution error: ${error.message}`;
        this.sendLogMessage('error', errorMessage);
        return {
          success: false,
          error: errorMessage,
          processedCount: 0,
          totalSubfolders: 0,
          taskIds: []
        };
      }
    });

    // Handle parallel upload status request
    ipcMain.handle('get-parallel-upload-status', async () => {
      try {
        if (!this.uploadService) {
          return {
            queue: { total: 0, running: 0, queued: 0, completed: 0, failed: 0 },
            progress: { total: 0, averagePercentage: 0 },
            stats: {},
            processes: []
          };
        }

        return this.uploadService.getParallelUploadStatus();
      } catch (error) {
        console.error('Failed to get parallel upload status:', error);
        return {
          queue: { total: 0, running: 0, queued: 0, completed: 0, failed: 0 },
          progress: { total: 0, averagePercentage: 0 },
          stats: {},
          processes: []
        };
      }
    });

    // Handle cancel all parallel uploads
    ipcMain.handle('cancel-all-parallel-uploads', async () => {
      try {
        if (!this.uploadService) {
          throw new Error('Upload service not initialized.');
        }

        this.sendLogMessage('warning', 'Cancelling all parallel uploads...');
        const result = await this.uploadService.cancelAllParallelUploads();

        this.sendLogMessage('info', `Cancelled ${result.cancelledCount || 0} parallel uploads`);
        return result;
      } catch (error) {
        const errorMessage = `Failed to cancel parallel uploads: ${error.message}`;
        this.sendLogMessage('error', errorMessage);
        return {
          success: false,
          error: errorMessage,
          cancelledCount: 0
        };
      }
    });

    // Handle cancel specific parallel upload
    ipcMain.handle('cancel-parallel-upload', async (event, taskId) => {
      try {
        if (!this.uploadService) {
          throw new Error('Upload service not initialized.');
        }

        const result = await this.uploadService.cancelParallelUpload(taskId);

        if (result) {
          this.sendLogMessage('info', `Cancelled upload task: ${taskId}`);
        } else {
          this.sendLogMessage('warning', `Failed to cancel upload task: ${taskId}`);
        }

        return result;
      } catch (error) {
        console.error(`Error cancelling upload task ${taskId}:`, error);
        return false;
      }
    });

    // Handle parallel configuration update
    ipcMain.handle('update-parallel-config', async (event, config) => {
      try {
        if (!this.uploadService) {
          throw new Error('Upload service not initialized.');
        }

        this.uploadService.updateParallelConfig(config);
        this.sendLogMessage('info', `Updated parallel configuration: ${JSON.stringify(config)}`);

        return {
          success: true,
          message: 'Configuration updated successfully'
        };
      } catch (error) {
        const errorMessage = `Failed to update parallel configuration: ${error.message}`;
        this.sendLogMessage('error', errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }
    });

    // Handle get parallel configuration
    ipcMain.handle('get-parallel-config', async () => {
      try {
        if (!this.uploadService) {
          return {
            maxConcurrentUploads: 10,
            retryAttempts: 3,
            retryDelay: 5000,
            workerTimeout: 3600000,
            heartbeatInterval: 5000
          };
        }

        return this.uploadService.getParallelConfig();
      } catch (error) {
        console.error('Failed to get parallel configuration:', error);
        return {
          maxConcurrentUploads: 10,
          retryAttempts: 3,
          retryDelay: 5000,
          workerTimeout: 3600000,
          heartbeatInterval: 5000
        };
      }
    });
  }

  sendLogMessage(level, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = {
      timestamp,
      level,
      message
    };

    if (this.window) {
      this.window.webContents.send('log-message', logMessage);
    }

    // Also log to console
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  }
}

// Handle app lifecycle
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // createWindow() would be called here if we had a global instance
  }
});

// Export for use by wrapper
function createUploadGUI(options) {
  return new UploadGUIMain(options);
}

// If this file is run directly (main Electron process)
if (require.main === module) {
  new UploadGUIMain();
}

module.exports = { createUploadGUI };