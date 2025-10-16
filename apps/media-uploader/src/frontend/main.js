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
    this.maxConcurrent = 1000;
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
    const maxConcurrentInput = document.getElementById('max-concurrent');
    const parallelModeCheckbox = document.getElementById('parallel-mode');

    maxConcurrentInput.addEventListener('input', (e) => {
      this.maxConcurrent = parseInt(e.target.value) || 1000;
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

    // NEW: Single File Operations event listeners
    const browsePictureConfigBtn = document.getElementById('browse-picture-config');
    const uploadPictureBtn = document.getElementById('upload-picture');
    browsePictureConfigBtn?.addEventListener('click', () => this.selectFile('picture-config-path'));
    uploadPictureBtn?.addEventListener('click', () => this.uploadPicture());

    const browseSubtitleMuxConfigBtn = document.getElementById('browse-subtitle-mux-config');
    const uploadSubtitleMuxBtn = document.getElementById('upload-subtitle-mux');
    browseSubtitleMuxConfigBtn?.addEventListener('click', () => this.selectFile('subtitle-mux-config-path'));
    uploadSubtitleMuxBtn?.addEventListener('click', () => this.uploadSubtitleToMux());

    const browseSubtitleSpecificConfigBtn = document.getElementById('browse-subtitle-specific-config');
    const uploadSubtitleSpecificBtn = document.getElementById('upload-subtitle-specific');
    browseSubtitleSpecificConfigBtn?.addEventListener('click', () => this.selectFile('subtitle-specific-config-path'));
    uploadSubtitleSpecificBtn?.addEventListener('click', () => this.uploadSubtitleSpecific());

    // NEW: Advanced Batch Operations event listeners
    const browseBatchPictureConfigBtn = document.getElementById('browse-batch-picture-config');
    const batchPictureUploadBtn = document.getElementById('batch-picture-upload');
    browseBatchPictureConfigBtn?.addEventListener('click', () => this.selectFile('batch-picture-config-path'));
    batchPictureUploadBtn?.addEventListener('click', () => this.batchPictureUpload());

    const browsePropagateConfigBtn = document.getElementById('browse-propagate-config');
    const propagateSeasonDataBtn = document.getElementById('propagate-season-data');
    browsePropagateConfigBtn?.addEventListener('click', () => this.selectFile('propagate-config-path'));
    propagateSeasonDataBtn?.addEventListener('click', () => this.propagateSeasonData());

    // NEW: Multi-Upload Manager event listeners
    const multiModeRadios = document.querySelectorAll('input[name="multi-mode"]');
    multiModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => this.switchMultiUploadMode(e.target.value));
    });

    const browseMultiParentBtn = document.getElementById('browse-multi-parent');
    const browseMultiFileBtn = document.getElementById('browse-multi-file');
    browseMultiParentBtn?.addEventListener('click', () => this.selectFolder('multi-parent-folder'));
    browseMultiFileBtn?.addEventListener('click', () => this.selectFile('multi-folders-file'));

    const multiUploadParentBtn = document.getElementById('multi-upload-parent');
    const multiUploadFileBtn = document.getElementById('multi-upload-file');
    const multiUploadStringBtn = document.getElementById('multi-upload-string');
    multiUploadParentBtn?.addEventListener('click', () => this.multiUploadFromParent());
    multiUploadFileBtn?.addEventListener('click', () => this.multiUploadFromFile());
    multiUploadStringBtn?.addEventListener('click', () => this.multiUploadFromString());

    // Enable/disable buttons based on input validation
    this.setupInputValidation();
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

  // ============================================================================
  // NEW METHODS - Single File Operations
  // ============================================================================

  async selectFile(inputId) {
    try {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: 'Opening file selection dialog...'
      });

      const result = await invoke('select_folder');  // Note: Tauri doesn't have separate file picker, using folder picker

      if (result.success && result.path) {
        const input = document.getElementById(inputId);
        if (input) {
          input.value = result.path;
          this.validateNewInputs();
        }
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error selecting file: ${error.message}`
      });
    }
  }

  async uploadPicture() {
    const configPath = document.getElementById('picture-config-path').value.trim();
    const dryRun = document.getElementById('picture-dry-run').checked;

    if (!configPath) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: 'Please select a config file'
      });
      return;
    }

    this.setProcessing(true, 'Uploading picture...', false);

    try {
      const result = await invoke('upload_picture', { configPath, dryRun });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Picture upload completed: ${result.message || 'Success'}`
        });
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Picture upload failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error uploading picture: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  async uploadSubtitleToMux() {
    const configPath = document.getElementById('subtitle-mux-config-path').value.trim();
    const dryRun = document.getElementById('subtitle-mux-dry-run').checked;

    if (!configPath) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: 'Please select a config file'
      });
      return;
    }

    this.setProcessing(true, 'Uploading subtitle to Mux...', false);

    try {
      const result = await invoke('upload_subtitle_to_mux', { configPath, dryRun });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Subtitle upload to Mux completed: ${result.message || 'Success'}`
        });
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Subtitle upload to Mux failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error uploading subtitle to Mux: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  async uploadSubtitleSpecific() {
    const configPath = document.getElementById('subtitle-specific-config-path').value.trim();
    const dryRun = document.getElementById('subtitle-specific-dry-run').checked;

    if (!configPath) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: 'Please select a config file'
      });
      return;
    }

    this.setProcessing(true, 'Uploading subtitle specific...', false);

    try {
      const result = await invoke('upload_subtitle_specific', { configPath, dryRun });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Subtitle specific upload completed: ${result.message || 'Success'}`
        });
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Subtitle specific upload failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error uploading subtitle specific: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  // ============================================================================
  // NEW METHODS - Advanced Batch Operations
  // ============================================================================

  async batchPictureUpload() {
    const configPath = document.getElementById('batch-picture-config-path').value.trim();
    const dryRun = document.getElementById('batch-picture-dry-run').checked;

    if (!configPath) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: 'Please select a config file'
      });
      return;
    }

    this.setProcessing(true, 'Batch picture upload...', false);

    try {
      const result = await invoke('batch_picture_upload', { configPath, dryRun });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Batch picture upload completed: ${result.message || 'Success'}`
        });
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Batch picture upload failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error in batch picture upload: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  async propagateSeasonData() {
    const seasonId = document.getElementById('season-id').value.trim();
    const configPath = document.getElementById('propagate-config-path').value.trim();
    const dryRun = document.getElementById('propagate-dry-run').checked;

    if (!seasonId) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: 'Please enter a season ID'
      });
      return;
    }

    if (!configPath) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: 'Please select a config file'
      });
      return;
    }

    this.setProcessing(true, 'Propagating season data...', false);

    try {
      const result = await invoke('propagate_season_data', { seasonId, configPath, dryRun });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Season data propagation completed: ${result.message || 'Success'}`
        });
      } else {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Season data propagation failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error propagating season data: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  // ============================================================================
  // NEW METHODS - Multi-Upload Manager
  // ============================================================================

  switchMultiUploadMode(mode) {
    // Hide all mode contents
    document.getElementById('multi-parent-mode').classList.add('hidden');
    document.getElementById('multi-file-mode').classList.add('hidden');
    document.getElementById('multi-string-mode').classList.add('hidden');

    // Show selected mode
    document.getElementById(`multi-${mode}-mode`).classList.remove('hidden');
  }

  async multiUploadFromParent() {
    const parentFolder = document.getElementById('multi-parent-folder').value.trim();
    const delay = parseInt(document.getElementById('multi-delay').value) || 10;
    const maxConcurrent = parseInt(document.getElementById('multi-concurrent').value) || 3;

    if (!parentFolder) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: 'Please select a parent folder'
      });
      return;
    }

    this.setProcessing(true, 'Multi-upload from parent folder...', false);

    try {
      const result = await invoke('multi_upload_from_parent', {
        parentFolder,
        delay,
        maxConcurrent
      });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Multi-upload from parent completed: ${result.processed_count}/${result.total_subfolders} successful`
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
          message: `Multi-upload from parent failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error in multi-upload from parent: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  async multiUploadFromFile() {
    const foldersFile = document.getElementById('multi-folders-file').value.trim();
    const delay = parseInt(document.getElementById('multi-delay').value) || 10;
    const maxConcurrent = parseInt(document.getElementById('multi-concurrent').value) || 3;

    if (!foldersFile) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: 'Please select a folders file'
      });
      return;
    }

    this.setProcessing(true, 'Multi-upload from file...', false);

    try {
      const result = await invoke('multi_upload_from_file', {
        foldersFile,
        delay,
        maxConcurrent
      });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Multi-upload from file completed: ${result.processed_count}/${result.total_subfolders} successful`
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
          message: `Multi-upload from file failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error in multi-upload from file: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  async multiUploadFromString() {
    const foldersString = document.getElementById('multi-folders-string').value.trim();
    const delay = parseInt(document.getElementById('multi-delay').value) || 10;
    const maxConcurrent = parseInt(document.getElementById('multi-concurrent').value) || 3;

    if (!foldersString) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: 'Please enter comma-separated folder paths'
      });
      return;
    }

    this.setProcessing(true, 'Multi-upload from string...', false);

    try {
      const result = await invoke('multi_upload_from_string', {
        foldersString,
        delay,
        maxConcurrent
      });

      if (result.success) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `Multi-upload from string completed: ${result.processed_count}/${result.total_subfolders} successful`
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
          message: `Multi-upload from string failed: ${result.error}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Error in multi-upload from string: ${error.message}`
      });
    }

    this.setProcessing(false);
  }

  // ============================================================================
  // NEW HELPER METHODS
  // ============================================================================

  setupInputValidation() {
    // Validate config inputs for enabling/disabling buttons
    const validateInput = (inputId, buttonId) => {
      const input = document.getElementById(inputId);
      const button = document.getElementById(buttonId);
      if (input && button) {
        input.addEventListener('input', () => {
          button.disabled = !input.value.trim();
        });
      }
    };

    // Single file operations
    validateInput('picture-config-path', 'upload-picture');
    validateInput('subtitle-mux-config-path', 'upload-subtitle-mux');
    validateInput('subtitle-specific-config-path', 'upload-subtitle-specific');

    // Advanced batch operations
    validateInput('batch-picture-config-path', 'batch-picture-upload');

    // Propagate requires both season ID and config
    const seasonIdInput = document.getElementById('season-id');
    const propagateConfigInput = document.getElementById('propagate-config-path');
    const propagateButton = document.getElementById('propagate-season-data');
    const validatePropagate = () => {
      if (seasonIdInput && propagateConfigInput && propagateButton) {
        propagateButton.disabled = !seasonIdInput.value.trim() || !propagateConfigInput.value.trim();
      }
    };
    seasonIdInput?.addEventListener('input', validatePropagate);
    propagateConfigInput?.addEventListener('input', validatePropagate);

    // Multi-upload
    validateInput('multi-parent-folder', 'multi-upload-parent');
    validateInput('multi-folders-file', 'multi-upload-file');
    validateInput('multi-folders-string', 'multi-upload-string');
  }

  validateNewInputs() {
    // Re-run validation after file selection
    this.setupInputValidation();
  }
}

// Initialize the application
const app = new MediaUploaderGUI();

// Make app available globally for event handlers
window.app = app;