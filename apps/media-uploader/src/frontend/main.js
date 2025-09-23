// Media Upload GUI - Tauri v2 Edition
import { invoke } from 'https://unpkg.com/@tauri-apps/api@2/core';
import { listen } from 'https://unpkg.com/@tauri-apps/api@2/event';

class MediaUploaderGUI {
  constructor() {
    this.currentFolder = null;
    this.isProcessing = false;
    this.autoScroll = true;
    this.logCount = 0;

    // Parallel processing state
    this.isParallelMode = true;
    this.maxConcurrent = 10;
    this.activeProcesses = new Map(); // taskId -> process info
    this.processListVisible = false;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  async init() {
    this.setupEventListeners();
    this.setupLogListener();
    this.updateUI();

    // Add initial welcome message
    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: 'Kyool Media Uploader initialized. Select a folder to begin.'
    });

    // Load initial configuration
    await this.loadInitialConfig();
  }

  setupEventListeners() {
    // Folder browsing
    const browseButton = document.getElementById('browse-folder');
    browseButton.addEventListener('click', () => this.selectFolder());

    // Config selection
    const configButton = document.getElementById('config-button');
    if (configButton) {
      configButton.addEventListener('click', () => this.selectConfig());
    }

    // Manual folder path entry
    const folderInput = document.getElementById('folder-path');
    folderInput.addEventListener('blur', () => this.validateManualPath());
    folderInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.validateManualPath();
      }
    });

    // Action buttons
    const prepareButton = document.getElementById('prepare-excel');
    prepareButton.addEventListener('click', () => this.prepareExcel());

    const uploadButton = document.getElementById('execute-upload');
    uploadButton.addEventListener('click', () => this.executeUpload());

    // Batch action buttons
    const prepareBatchButton = document.getElementById('prepare-excel-batch');
    prepareBatchButton.addEventListener('click', () => this.prepareExcelBatch());

    const uploadBatchButton = document.getElementById('execute-upload-batch');
    uploadBatchButton.addEventListener('click', () => this.executeUploadBatch());

    // Excel bulk edit controls
    const bulkEditButton = document.getElementById('excel-bulk-edit');
    bulkEditButton.addEventListener('click', () => this.executeBulkEdit());

    const fieldNameInput = document.getElementById('excel-field-name');
    const fieldValueInput = document.getElementById('excel-field-value');

    // Enable/disable bulk edit button based on input validation
    const validateBulkEditInputs = () => {
      const fieldName = fieldNameInput.value.trim();
      const fieldValue = fieldValueInput.value.trim();
      const isValid = fieldName && fieldValue && this.currentFolder;
      bulkEditButton.disabled = !isValid;
    };

    fieldNameInput.addEventListener('input', validateBulkEditInputs);
    fieldValueInput.addEventListener('input', validateBulkEditInputs);
    fieldNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') fieldValueInput.focus();
    });
    fieldValueInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !bulkEditButton.disabled) this.executeBulkEdit();
    });

    // Log controls
    const clearLogsButton = document.getElementById('clear-logs');
    clearLogsButton.addEventListener('click', () => this.clearLogs());

    const scrollToggleButton = document.getElementById('scroll-toggle');
    scrollToggleButton.addEventListener('click', () => this.toggleAutoScroll());

    // Config path click for changing config
    const configPath = document.getElementById('config-path');
    configPath.addEventListener('click', () => this.selectConfig());
    configPath.style.cursor = 'pointer';

    // Parallel processing controls
    const maxConcurrentSlider = document.getElementById('max-concurrent');
    const concurrentValue = document.getElementById('concurrent-value');
    const parallelModeCheckbox = document.getElementById('parallel-mode');

    maxConcurrentSlider.addEventListener('input', (e) => {
      this.maxConcurrent = parseInt(e.target.value);
      concurrentValue.textContent = this.maxConcurrent;
    });

    parallelModeCheckbox.addEventListener('change', (e) => {
      this.isParallelMode = e.target.checked;
      this.updateParallelControls();
    });

    // Parallel process control buttons
    const cancelAllButton = document.getElementById('cancel-all');
    cancelAllButton.addEventListener('click', () => this.cancelAllParallelUploads());

    // Start parallel status monitoring
    this.startParallelStatusMonitoring();
  }

  async setupLogListener() {
    try {
      // Listen for log messages from Tauri backend
      await listen('log-message', (event) => {
        this.addLogMessage(event.payload);
      });

      // Listen for config updates
      await listen('config-loaded', (event) => {
        this.updateConfigDisplay(event.payload);
      });
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }

  async selectFolder() {
    try {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: 'Opening folder selection dialog...'
      });

      const result = await invoke('select_folder');

      if (result.success && result.path) {
        this.setCurrentFolder(result.path);
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'warning',
          message: 'Folder selection was cancelled or failed'
        });
      }
    } catch (error) {
      console.error('Folder selection error:', error);
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error selecting folder: ${error.message || error}`
      });
    }
  }

  async validateManualPath() {
    const folderInput = document.getElementById('folder-path');
    const path = folderInput.value.trim();

    if (!path) {
      this.clearCurrentFolder();
      return;
    }

    try {
      const result = await invoke('validate_path', { path });

      if (result.success) {
        this.setCurrentFolder(result.path);
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Invalid path: ${result.error}`
        });
        this.clearCurrentFolder();
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error validating path: ${error.message}`
      });
      this.clearCurrentFolder();
    }
  }

  async prepareExcel() {
    if (!this.currentFolder || this.isProcessing) return;

    this.setProcessing(true, 'Preparing Excel...');

    try {
      const result = await invoke('prepare_excel', { folderPath: this.currentFolder });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Excel preparation completed: ${result.message}`
        });
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Excel preparation failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error preparing Excel: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  async executeUpload() {
    if (!this.currentFolder || this.isProcessing) return;

    // Set processing status without showing overlay, and provide immediate feedback
    this.setProcessing(true, 'Upload in progress...', false);

    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: `🚀 Upload initiated for: ${this.currentFolder}`
    });

    try {
      const result = await invoke('execute_upload', { folderPath: this.currentFolder });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Upload completed: ${result.message}`
        });
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Upload failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error executing upload: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  async prepareExcelBatch() {
    if (!this.currentFolder || this.isProcessing) return;

    this.setProcessing(true, 'Preparing Excel for all subfolders...');

    try {
      const result = await invoke('prepare_excel_batch', { parentFolderPath: this.currentFolder });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Batch Excel preparation completed: ${result.processed_count}/${result.total_subfolders} successful`
        });

        if (result.failed_folders && result.failed_folders.length > 0) {
          this.addLogMessage({
            timestamp: new Date().toLocaleTimeString(),
            level: 'warning',
            message: `Failed folders: ${result.failed_folders.join(', ')}`
          });
        }
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Batch Excel preparation failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error preparing Excel batch: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  async executeUploadBatch() {
    if (!this.currentFolder || this.isProcessing) return;

    if (this.isParallelMode) {
      await this.executeUploadBatchParallel();
    } else {
      await this.executeUploadBatchSequential();
    }
  }

  async executeUploadBatchSequential() {
    // Set processing status without showing overlay, and provide immediate feedback
    this.setProcessing(true, 'Sequential batch upload in progress...', false);

    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: `🚀 Sequential batch upload initiated for subfolders in: ${this.currentFolder}`
    });

    try {
      const result = await invoke('execute_upload_batch', { parentFolderPath: this.currentFolder });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Batch upload completed: ${result.processed_count}/${result.total_subfolders} successful`
        });

        if (result.failed_folders && result.failed_folders.length > 0) {
          this.addLogMessage({
            timestamp: new Date().toLocaleTimeString(),
            level: 'warning',
            message: `Failed folders: ${result.failed_folders.join(', ')}`
          });
        }
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Batch upload failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error executing batch upload: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  async executeUploadBatchParallel() {
    // Set processing status without showing overlay, and provide immediate feedback
    this.setProcessing(true, 'Parallel batch upload in progress...', false);

    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: `🚀 Parallel batch upload initiated for subfolders in: ${this.currentFolder} (max concurrent: ${this.maxConcurrent})`
    });

    try {
      const result = await invoke('execute_upload_batch_parallel', {
        parentFolderPath: this.currentFolder,
        maxConcurrent: this.maxConcurrent
      });

      if (result.success) {
        // Show information about processing summary
        const totalFolders = result.total_subfolders || 0;
        const validFolders = result.valid_folders || 0;
        const skippedFolders = result.skipped_folders || 0;
        const processedCount = result.processed_count || 0;

        let statusMessage = `Worker pool parallel batch upload completed for ${totalFolders} folders`;
        if (skippedFolders > 0) {
          statusMessage += ` (${validFolders} valid, ${skippedFolders} skipped without Excel files)`;
        }
        statusMessage += ` - ${processedCount} successful`;

        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: statusMessage
        });

        // Show information about skipped folders if any
        if (skippedFolders > 0 && result.skipped_folder_names) {
          this.addLogMessage({
            timestamp: new Date().toLocaleTimeString(),
            level: 'warning',
            message: `⚠️ Skipped ${skippedFolders} folders without Excel files: ${result.skipped_folder_names.join(', ')}`
          });
        }

        // Show the parallel process controls
        this.showParallelProcessControls(true);
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Failed to start parallel batch upload: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error starting parallel batch upload: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  async executeBulkEdit() {
    const fieldName = document.getElementById('excel-field-name').value.trim();
    const fieldValue = document.getElementById('excel-field-value').value.trim();
    const dryRun = document.getElementById('excel-dry-run').checked;

    if (!fieldName || !fieldValue) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: 'Field name and value are required for bulk edit'
      });
      return;
    }

    this.setProcessing(true, `${dryRun ? 'Previewing' : 'Executing'} bulk edit...`);

    try {
      const result = await invoke('excel_bulk_edit', {
        folderPath: this.currentFolder,
        fieldName,
        fieldValue,
        dryRun
      });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Bulk edit ${dryRun ? 'preview' : 'execution'} completed: ${result.message}`
        });
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Bulk edit failed: ${result.error}`
        });
      }
    } catch (error) {
      console.error('Excel bulk edit error:', error);
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error executing bulk edit: ${error.message || error || 'Unknown error'}`
      });
    }

    this.setProcessing(false);
  }

  async selectConfig() {
    try {
      const result = await invoke('select_config');

      if (result.success) {
        this.updateConfigDisplay(result);
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Configuration loaded: ${result.config_path}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error selecting config: ${error.message}`
      });
    }
  }

  async loadInitialConfig() {
    try {
      const result = await invoke('reload_config');
      this.updateConfigDisplay(result);
    } catch (error) {
      console.error('Error loading initial config:', error);
    }
  }

  async cancelAllParallelUploads() {
    try {
      const result = await invoke('cancel_all_parallel_uploads');

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Cancelled all parallel uploads`
        });
        this.showParallelProcessControls(false);
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error cancelling uploads: ${error.message}`
      });
    }
  }

  startParallelStatusMonitoring() {
    // Monitor parallel upload status every 2 seconds
    setInterval(async () => {
      if (this.processListVisible) {
        try {
          const status = await invoke('get_parallel_upload_status');
          this.updateParallelStatus(status);
        } catch (error) {
          console.error('Error getting parallel status:', error);
        }
      }
    }, 2000);
  }

  setCurrentFolder(path) {
    this.currentFolder = path;
    const folderInput = document.getElementById('folder-path');
    folderInput.value = path;
    this.updateUI();

    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: `Selected folder: ${path}`
    });
  }

  clearCurrentFolder() {
    this.currentFolder = null;
    const folderInput = document.getElementById('folder-path');
    folderInput.value = '';
    this.updateUI();
  }

  setProcessing(processing, statusText = '', showOverlay = true) {
    this.isProcessing = processing;
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const statusTextElement = document.getElementById('status-text');
    const statusIcon = document.getElementById('status-icon');

    if (processing) {
      if (showOverlay) {
        loadingOverlay.classList.remove('hidden');
        loadingText.textContent = statusText;
      }
      statusTextElement.textContent = statusText;
      statusIcon.textContent = '🔄';
    } else {
      loadingOverlay.classList.add('hidden');
      statusTextElement.textContent = 'Ready';
      statusIcon.textContent = '⚪';
    }

    this.updateUI();
  }

  updateUI() {
    const hasFolder = !!this.currentFolder;
    const isEnabled = hasFolder && !this.isProcessing;

    // Enable/disable action buttons
    document.getElementById('prepare-excel').disabled = !isEnabled;
    document.getElementById('execute-upload').disabled = !isEnabled;
    document.getElementById('prepare-excel-batch').disabled = !isEnabled;
    document.getElementById('execute-upload-batch').disabled = !isEnabled;

    // Update bulk edit button state
    const fieldName = document.getElementById('excel-field-name').value.trim();
    const fieldValue = document.getElementById('excel-field-value').value.trim();
    const bulkEditEnabled = isEnabled && fieldName && fieldValue;
    document.getElementById('excel-bulk-edit').disabled = !bulkEditEnabled;
  }

  updateConfigDisplay(configInfo) {
    const configPath = document.getElementById('config-path');

    if (configInfo.config_path) {
      const shortPath = configInfo.config_path.split(/[/\\]/).pop();
      configPath.textContent = shortPath;
      configPath.title = configInfo.config_path;
      configPath.className = configInfo.is_valid ? 'config-path valid' : 'config-path invalid';
    } else {
      configPath.textContent = 'No config';
      configPath.title = 'Click to select configuration file';
      configPath.className = 'config-path invalid';
    }
  }

  addLogMessage(logData) {
    this.logCount++;
    const logsContent = document.getElementById('logs-content');

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${logData.level}`;

    const timestamp = document.createElement('span');
    timestamp.className = 'log-timestamp';
    timestamp.textContent = logData.timestamp;

    const level = document.createElement('span');
    level.className = 'log-level';
    level.textContent = logData.level.toUpperCase();

    const message = document.createElement('span');
    message.className = 'log-message';
    message.textContent = logData.message;

    logEntry.appendChild(timestamp);
    logEntry.appendChild(level);
    logEntry.appendChild(message);

    logsContent.appendChild(logEntry);

    // Auto-scroll to bottom if enabled
    if (this.autoScroll) {
      const logsContainer = document.getElementById('logs-container');
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    // Limit log entries to prevent memory issues
    const maxLogEntries = 1000;
    if (this.logCount > maxLogEntries) {
      const firstEntry = logsContent.firstElementChild;
      if (firstEntry) {
        firstEntry.remove();
        this.logCount--;
      }
    }
  }

  clearLogs() {
    const logsContent = document.getElementById('logs-content');
    logsContent.innerHTML = '';
    this.logCount = 0;

    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: 'Logs cleared'
    });
  }

  toggleAutoScroll() {
    this.autoScroll = !this.autoScroll;
    const scrollToggleButton = document.getElementById('scroll-toggle');

    if (this.autoScroll) {
      scrollToggleButton.classList.add('active');
      scrollToggleButton.textContent = 'Auto-scroll';

      // Scroll to bottom immediately
      const logsContainer = document.getElementById('logs-container');
      logsContainer.scrollTop = logsContainer.scrollHeight;
    } else {
      scrollToggleButton.classList.remove('active');
      scrollToggleButton.textContent = 'Manual scroll';
    }
  }

  updateParallelControls() {
    const processControls = document.getElementById('parallel-process-controls');
    if (this.isParallelMode && this.processListVisible) {
      processControls.classList.remove('hidden');
    } else {
      processControls.classList.add('hidden');
    }
  }

  showParallelProcessControls(visible) {
    this.processListVisible = visible;
    this.updateParallelControls();
  }

  updateParallelStatus(status) {
    // Update process summary
    document.getElementById('total-count').textContent = status.queue.total;
    document.getElementById('running-count').textContent = status.queue.running;
    document.getElementById('queued-count').textContent = status.queue.queued;
    document.getElementById('completed-count').textContent = status.queue.completed;
    document.getElementById('failed-count').textContent = status.queue.failed;

    // Update process list
    const processList = document.getElementById('process-list');
    processList.innerHTML = '';

    status.processes.forEach(process => {
      const processItem = document.createElement('div');
      processItem.className = `process-item process-${process.status}`;
      processItem.innerHTML = `
        <div class="process-info">
          <span class="process-folder">${process.folder_path}</span>
          <span class="process-status">${process.status}</span>
        </div>
        <div class="process-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${process.progress}%"></div>
          </div>
          <span class="progress-text">${Math.round(process.progress)}%</span>
        </div>
        <button class="cancel-process-button" onclick="app.cancelParallelUpload('${process.task_id}')">
          Cancel
        </button>
      `;
      processList.appendChild(processItem);
    });
  }

  async cancelParallelUpload(taskId) {
    try {
      const success = await invoke('cancel_parallel_upload', { taskId });
      if (success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Cancelled upload task: ${taskId}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error cancelling task ${taskId}: ${error.message}`
      });
    }
  }
}

// Initialize the application
const app = new MediaUploaderGUI();

// Make app available globally for event handlers
window.app = app;