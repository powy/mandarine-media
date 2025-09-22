// Upload GUI Renderer Process
class UploadGUI {
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

  init() {
    this.setupEventListeners();
    this.setupLogListener();
    this.setupConfigListener();
    this.updateUI();

    // Add initial welcome message
    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: 'Media Upload GUI initialized. Select a folder to begin.'
    });
  }

  setupEventListeners() {
    // Folder browsing
    const browseButton = document.getElementById('browse-folder');
    browseButton.addEventListener('click', () => this.selectFolder());

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
    configPath.title = 'Click to select a different configuration file';

    // Parallel processing controls
    const maxConcurrentSlider = document.getElementById('max-concurrent');
    const concurrentValue = document.getElementById('concurrent-value');
    const parallelModeToggle = document.getElementById('parallel-mode');

    maxConcurrentSlider.addEventListener('input', (e) => {
      this.maxConcurrent = parseInt(e.target.value);
      concurrentValue.textContent = this.maxConcurrent;
      this.updateParallelConfig();
    });

    parallelModeToggle.addEventListener('change', (e) => {
      this.isParallelMode = e.target.checked;
      this.updateParallelModeDisplay();
    });

    // Parallel process control buttons
    const pauseAllButton = document.getElementById('pause-all');
    const resumeAllButton = document.getElementById('resume-all');
    const cancelAllButton = document.getElementById('cancel-all');

    pauseAllButton.addEventListener('click', () => this.pauseAllProcesses());
    resumeAllButton.addEventListener('click', () => this.resumeAllProcesses());
    cancelAllButton.addEventListener('click', () => this.cancelAllProcesses());
  }

  setupLogListener() {
    window.electronAPI.onLogMessage((message) => {
      this.addLogMessage(message);

      // Handle parallel processing messages
      this.handleParallelMessage(message);
    });
  }

  setupConfigListener() {
    window.electronAPI.onConfigLoaded((configInfo) => {
      this.updateConfigInfo(configInfo);
    });
  }

  /**
   * Handle parallel processing log messages
   */
  handleParallelMessage(message) {
    switch (message.level) {
      case 'process-update':
        this.updateProcessStatus(message.taskId, message.processInfo);
        break;
      case 'queue-update':
        this.updateQueueSummary(message.queueInfo);
        break;
      case 'progress-update':
        this.updateProcessProgress(message.taskId, message.progressData);
        break;
    }
  }

  async selectFolder() {
    if (this.isProcessing) return;

    try {
      const result = await window.electronAPI.selectFolder();

      if (result.success) {
        this.currentFolder = result.path;
        this.updateFolderDisplay();
        this.updateUI();

        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Selected folder: ${result.path}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Failed to select folder: ${error.message}`
      });
    }
  }

  async validateManualPath() {
    if (this.isProcessing) return;

    const folderInput = document.getElementById('folder-path');
    const enteredPath = folderInput.value.trim();

    // If empty, clear current folder
    if (!enteredPath) {
      this.currentFolder = null;
      this.updateFolderDisplay();
      this.updateUI();
      return;
    }

    // If path hasn't changed, skip validation
    if (enteredPath === this.currentFolder) {
      return;
    }

    try {
      // Validate path with backend
      const result = await window.electronAPI.validatePath(enteredPath);

      if (result.success && result.isDirectory) {
        this.currentFolder = enteredPath;
        this.updateFolderDisplay();
        this.updateUI();

        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Path validated: ${enteredPath}`
        });

        // Remove any error styling
        folderInput.classList.remove('error');
      } else {
        // Path is invalid
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Invalid path: ${enteredPath} ${!result.exists ? '(does not exist)' : '(not a directory)'}`
        });

        // Add error styling
        folderInput.classList.add('error');

        // Don't update currentFolder if invalid
        // But keep the text in the input so user can correct it
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Path validation failed: ${error.message}`
      });

      folderInput.classList.add('error');
    }
  }

  async prepareExcel() {
    if (!this.currentFolder || this.isProcessing) return;

    this.setProcessingState(true, 'Preparing Excel...');

    try {
      const result = await window.electronAPI.prepareExcel(this.currentFolder);

      if (result.success) {
        this.setStatus('success', result.message);
      } else {
        this.setStatus('error', result.error);
      }
    } catch (error) {
      this.setStatus('error', `Preparation failed: ${error.message}`);
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Preparation failed: ${error.message}`
      });
    } finally {
      this.setProcessingState(false);
    }
  }

  async executeUpload() {
    if (!this.currentFolder || this.isProcessing) return;

    this.setProcessingState(true, 'Executing Upload...');

    try {
      const result = await window.electronAPI.executeUpload(this.currentFolder);

      if (result.success) {
        this.setStatus('success', result.message);
        if (result.mediaDescriptionId) {
          this.addLogMessage({
            timestamp: new Date().toLocaleTimeString(),
            level: 'success',
            message: `🎉 Upload completed! Media Description ID: ${result.mediaDescriptionId}`
          });
        }
      } else {
        this.setStatus('error', result.error);
      }
    } catch (error) {
      this.setStatus('error', `Upload failed: ${error.message}`);
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Upload failed: ${error.message}`
      });
    } finally {
      this.setProcessingState(false);
    }
  }

  async prepareExcelBatch() {
    if (!this.currentFolder || this.isProcessing) return;

    this.setProcessingState(true, 'Preparing Excel for all subfolders...');
    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: `📋 Starting batch Excel preparation for all subfolders in: ${this.currentFolder}`
    });

    try {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: `🔧 Renderer: Calling prepareExcelBatch with folder: ${this.currentFolder}`
      });

      const result = await window.electronAPI.prepareExcelBatch(this.currentFolder);

      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: `📊 Renderer: Received result: ${JSON.stringify(result, null, 2)}`
      });

      if (result.success) {
        this.setStatus('success', `Batch Excel preparation completed: ${result.processedCount}/${result.totalSubfolders} successful`);
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `✅ Batch Excel preparation completed: ${result.processedCount}/${result.totalSubfolders} successful`
        });
      } else {
        this.setStatus('error', result.error);
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `❌ Batch Excel preparation failed: ${result.error}`
        });
      }
    } catch (error) {
      this.setStatus('error', `Batch Excel preparation failed: ${error.message}`);
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `❌ Batch Excel preparation failed: ${error.message}`
      });
    } finally {
      this.setProcessingState(false);
    }
  }

  async executeUploadBatch() {
    if (!this.currentFolder || this.isProcessing) return;

    if (this.isParallelMode) {
      await this.executeUploadBatchParallel();
    } else {
      await this.executeUploadBatchSequential();
    }
  }

  async executeUploadBatchParallel() {
    this.setProcessingState(true, 'Starting parallel upload for all subfolders...');
    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: `🚀 Starting parallel batch upload (${this.maxConcurrent} concurrent) for subfolders in: ${this.currentFolder}`
    });

    try {
      const result = await window.electronAPI.executeUploadBatchParallel(this.currentFolder, this.maxConcurrent);

      if (result.success) {
        this.setStatus('success', result.message);
        this.showProcessControls();

        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `✅ ${result.message}`
        });

        // Initialize process tracking
        this.initializeProcessTracking(result.taskIds);

      } else {
        this.setStatus('error', result.error);
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `❌ Parallel batch upload failed: ${result.error}`
        });
      }
    } catch (error) {
      this.setStatus('error', `Parallel batch upload failed: ${error.message}`);
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `❌ Parallel batch upload failed: ${error.message}`
      });
    } finally {
      this.setProcessingState(false);
    }
  }

  async executeUploadBatchSequential() {
    this.setProcessingState(true, 'Executing upload for all subfolders...');
    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: `🚀 Starting sequential batch upload for all subfolders in: ${this.currentFolder}`
    });

    try {
      const result = await window.electronAPI.executeUploadBatch(this.currentFolder);

      if (result.success) {
        this.setStatus('success', `Batch upload completed: ${result.processedCount}/${result.totalSubfolders} successful`);
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `🎉 Batch upload completed: ${result.processedCount}/${result.totalSubfolders} successful`
        });
      } else {
        this.setStatus('error', result.error);
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `❌ Batch upload failed: ${result.error}`
        });
      }
    } catch (error) {
      this.setStatus('error', `Batch upload failed: ${error.message}`);
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `❌ Batch upload failed: ${error.message}`
      });
    } finally {
      this.setProcessingState(false);
    }
  }

  async selectConfig() {
    if (this.isProcessing) return;

    try {
      const result = await window.electronAPI.selectConfig();

      if (result.success) {
        this.updateConfigInfo(result);
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Configuration changed to: ${result.configPath}`
        });
      }
    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `Failed to change configuration: ${error.message}`
      });
    }
  }

  updateBulkEditButtonState() {
    const bulkEditButton = document.getElementById('excel-bulk-edit');
    const fieldNameInput = document.getElementById('excel-field-name');
    const fieldValueInput = document.getElementById('excel-field-value');

    if (!bulkEditButton || !fieldNameInput || !fieldValueInput) return;

    const fieldName = fieldNameInput.value.trim();
    const fieldValue = fieldValueInput.value.trim();
    const hasFolder = !!this.currentFolder;
    const isValid = fieldName && fieldValue && hasFolder && !this.isProcessing;

    bulkEditButton.disabled = !isValid;

    if (isValid) {
      bulkEditButton.classList.add('enabled');
    } else {
      bulkEditButton.classList.remove('enabled');
    }
  }

  async executeBulkEdit() {
    if (this.isProcessing) return;

    const fieldNameInput = document.getElementById('excel-field-name');
    const fieldValueInput = document.getElementById('excel-field-value');
    const dryRunCheckbox = document.getElementById('excel-dry-run');

    const fieldName = fieldNameInput.value.trim();
    const fieldValue = fieldValueInput.value.trim();
    const dryRun = dryRunCheckbox.checked;

    // Validation
    if (!fieldName) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: 'Please enter a field name'
      });
      return;
    }

    if (!fieldValue) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: 'Please enter a field value'
      });
      return;
    }

    if (!this.currentFolder) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: 'Please select a folder first'
      });
      return;
    }

    try {
      this.setProcessingState(true, `${dryRun ? 'Previewing' : 'Executing'} bulk edit...`);

      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: `${dryRun ? '🔍 Starting dry run for' : '✏️ Starting'} bulk edit: "${fieldName}" = "${fieldValue}"`
      });

      const result = await window.electronAPI.excelBulkEdit(
        this.currentFolder,
        fieldName,
        fieldValue,
        dryRun
      );

      if (result.success) {
        const mode = dryRun ? 'Dry run completed' : 'Bulk edit completed';
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `✅ ${mode} successfully! Processed ${result.totalFiles} files (${result.successful} successful, ${result.failed} failed)`
        });

        // Show details of successful files
        if (result.details && result.details.length > 0) {
          this.addLogMessage({
            timestamp: new Date().toLocaleTimeString(),
            level: 'info',
            message: `📁 Successfully updated folders: ${result.details.map(d => d.folder).join(', ')}`
          });
        }

        if (dryRun) {
          this.addLogMessage({
            timestamp: new Date().toLocaleTimeString(),
            level: 'info',
            message: 'Uncheck "Dry Run" to apply changes to Excel files'
          });
        }
      } else {
        // Show summary
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `❌ Bulk edit completed with errors: ${result.successful} successful, ${result.failed} failed out of ${result.totalFiles} files`
        });

        // Show successful files if any
        if (result.details && result.details.length > 0) {
          this.addLogMessage({
            timestamp: new Date().toLocaleTimeString(),
            level: 'info',
            message: `✅ Successfully updated folders: ${result.details.map(d => d.folder).join(', ')}`
          });
        }
      }

      // Always show all errors if any exist
      if (result.errors && result.errors.length > 0) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `❌ Errors encountered in ${result.errors.length} folder(s):`
        });

        result.errors.forEach(error => {
          this.addLogMessage({
            timestamp: new Date().toLocaleTimeString(),
            level: 'error',
            message: `   • ${error.folder}: ${error.error}`
          });
        });
      }

    } catch (error) {
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `❌ Bulk edit failed: ${error.message}`
      });
    } finally {
      this.setProcessingState(false);
    }
  }

  updateFolderDisplay() {
    const folderInput = document.getElementById('folder-path');
    folderInput.value = this.currentFolder || '';
    folderInput.title = this.currentFolder || '';
  }

  updateConfigInfo(configInfo) {
    const configPathElement = document.getElementById('config-path');
    configPathElement.textContent = configInfo.configPath ?
      configInfo.configPath.split(/[/\\]/).pop() : 'config.ini';
    configPathElement.title = configInfo.configPath || 'config.ini';

    if (!configInfo.isValid) {
      configPathElement.style.color = '#e53e3e';
      configPathElement.title += ' (Invalid configuration - click to select)';
    } else {
      configPathElement.style.color = '';
    }
  }

  updateUI() {
    const prepareButton = document.getElementById('prepare-excel');
    const uploadButton = document.getElementById('execute-upload');
    const prepareBatchButton = document.getElementById('prepare-excel-batch');
    const uploadBatchButton = document.getElementById('execute-upload-batch');
    const bulkEditButton = document.getElementById('excel-bulk-edit');

    const hasFolder = !!this.currentFolder;
    const isDisabled = !hasFolder || this.isProcessing;

    // Single folder buttons
    prepareButton.disabled = isDisabled;
    uploadButton.disabled = isDisabled;

    // Batch buttons
    prepareBatchButton.disabled = isDisabled;
    uploadBatchButton.disabled = isDisabled;

    // Bulk edit button - check inputs and folder
    this.updateBulkEditButtonState();

    // Update button states visually
    if (hasFolder && !this.isProcessing) {
      prepareButton.classList.add('enabled');
      uploadButton.classList.add('enabled');
      prepareBatchButton.classList.add('enabled');
      uploadBatchButton.classList.add('enabled');
    } else {
      prepareButton.classList.remove('enabled');
      uploadButton.classList.remove('enabled');
      prepareBatchButton.classList.remove('enabled');
      uploadBatchButton.classList.remove('enabled');
    }
  }

  setProcessingState(processing, message = '') {
    this.isProcessing = processing;

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    if (processing) {
      loadingOverlay.classList.remove('hidden');
      loadingText.textContent = message;
      this.setStatus('processing', message);
    } else {
      loadingOverlay.classList.add('hidden');
      this.setStatus('idle', 'Ready');
    }

    this.updateUI();
  }

  setStatus(level, message) {
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');

    // Remove all status classes
    statusText.className = 'status-text';

    switch (level) {
      case 'idle':
        statusIcon.textContent = '⚪';
        statusText.classList.add('status-idle');
        break;
      case 'processing':
        statusIcon.textContent = '🔄';
        statusText.classList.add('status-processing');
        break;
      case 'success':
        statusIcon.textContent = '✅';
        statusText.classList.add('status-success');
        break;
      case 'error':
        statusIcon.textContent = '❌';
        statusText.classList.add('status-error');
        break;
    }

    statusText.textContent = message;
  }

  addLogMessage(logMessage) {
    const logsContent = document.getElementById('logs-content');
    const messageElement = document.createElement('div');
    messageElement.className = 'log-message';

    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'log-timestamp';
    timestampSpan.textContent = logMessage.timestamp;

    const messageSpan = document.createElement('span');
    messageSpan.className = `log-level-${logMessage.level}`;
    messageSpan.textContent = logMessage.message;

    messageElement.appendChild(timestampSpan);
    messageElement.appendChild(messageSpan);

    logsContent.appendChild(messageElement);

    // Auto-scroll if enabled
    if (this.autoScroll) {
      logsContent.scrollTop = logsContent.scrollHeight;
    }

    // Limit log messages (keep last 1000)
    this.logCount++;
    if (this.logCount > 1000) {
      const firstMessage = logsContent.firstChild;
      if (firstMessage) {
        logsContent.removeChild(firstMessage);
        this.logCount--;
      }
    }
  }

  clearLogs() {
    const logsContent = document.getElementById('logs-content');
    logsContent.innerHTML = '';
    this.logCount = 0;

    // Add cleared message
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
      scrollToggleButton.setAttribute('data-auto-scroll', 'true');

      // Scroll to bottom when auto-scroll is re-enabled
      const logsContent = document.getElementById('logs-content');
      logsContent.scrollTop = logsContent.scrollHeight;
    } else {
      scrollToggleButton.classList.remove('active');
      scrollToggleButton.setAttribute('data-auto-scroll', 'false');
    }
  }

  // ==================== PARALLEL PROCESSING METHODS ====================

  /**
   * Update parallel processing configuration
   */
  async updateParallelConfig() {
    try {
      await window.electronAPI.updateParallelConfig({
        maxConcurrentUploads: this.maxConcurrent
      });
    } catch (error) {
      console.error('Failed to update parallel config:', error);
    }
  }

  /**
   * Update parallel mode display
   */
  updateParallelModeDisplay() {
    const processControls = document.getElementById('parallel-process-controls');
    const uploadButton = document.getElementById('execute-upload-batch');

    if (this.isParallelMode) {
      uploadButton.querySelector('.button-subtitle').textContent =
        'Upload all subfolders in parallel (independent processes)';
    } else {
      uploadButton.querySelector('.button-subtitle').textContent =
        'Upload all subfolders sequentially (one at a time)';
      processControls.classList.add('hidden');
    }
  }

  /**
   * Show process controls section
   */
  showProcessControls() {
    const processControls = document.getElementById('parallel-process-controls');
    processControls.classList.remove('hidden');
    this.processListVisible = true;
  }

  /**
   * Hide process controls section
   */
  hideProcessControls() {
    const processControls = document.getElementById('parallel-process-controls');
    processControls.classList.add('hidden');
    this.processListVisible = false;
  }

  /**
   * Initialize process tracking for parallel uploads
   */
  initializeProcessTracking(taskIds) {
    // Clear existing processes
    this.activeProcesses.clear();

    // Initialize each process
    taskIds.forEach(taskId => {
      this.activeProcesses.set(taskId, {
        taskId,
        status: 'queued',
        folderName: 'Loading...',
        progress: 0,
        phase: 'queued',
        startTime: null,
        element: null
      });
    });

    // Render process list
    this.renderProcessList();

    // Enable control buttons
    this.updateProcessControlButtons();
  }

  /**
   * Update process status
   */
  updateProcessStatus(taskId, processInfo) {
    if (!this.activeProcesses.has(taskId)) {
      // Add new process if not tracked yet
      this.activeProcesses.set(taskId, {
        taskId,
        status: processInfo.status,
        folderName: this.extractFolderName(processInfo.folderPath),
        progress: 0,
        phase: processInfo.status,
        startTime: processInfo.startTime,
        element: null
      });
    } else {
      // Update existing process
      const process = this.activeProcesses.get(taskId);
      process.status = processInfo.status;
      process.folderName = this.extractFolderName(processInfo.folderPath);
      process.startTime = processInfo.startTime;
    }

    this.renderProcessList();
    this.updateProcessControlButtons();
  }

  /**
   * Update process progress
   */
  updateProcessProgress(taskId, progressData) {
    if (!progressData) return;

    const process = this.activeProcesses.get(taskId);
    if (process) {
      process.progress = progressData.percentage || 0;
      process.phase = progressData.phase || process.phase;
      process.folderName = this.extractFolderName(progressData.folderPath);

      this.updateProcessElement(taskId, process);
    }
  }

  /**
   * Update queue summary
   */
  updateQueueSummary(queueInfo) {
    document.getElementById('total-count').textContent = queueInfo.total || 0;
    document.getElementById('running-count').textContent = queueInfo.running || 0;
    document.getElementById('queued-count').textContent = queueInfo.queued || 0;
    document.getElementById('completed-count').textContent = queueInfo.completed || 0;
    document.getElementById('failed-count').textContent = queueInfo.failed || 0;

    this.updateProcessControlButtons();
  }

  /**
   * Render the process list
   */
  renderProcessList() {
    const processListContainer = document.getElementById('process-list');
    processListContainer.innerHTML = '';

    this.activeProcesses.forEach((process, taskId) => {
      const processElement = this.createProcessElement(process);
      processListContainer.appendChild(processElement);

      // Store reference to element
      process.element = processElement;
    });
  }

  /**
   * Create a process element
   */
  createProcessElement(process) {
    const element = document.createElement('div');
    element.className = `process-item process-${process.status}`;
    element.setAttribute('data-task-id', process.taskId);

    const statusIcon = this.getStatusIcon(process.status);
    const progressPercent = Math.max(0, Math.min(100, process.progress || 0));

    element.innerHTML = `
      <div class="process-header">
        <div class="process-info">
          <span class="process-icon">${statusIcon}</span>
          <span class="process-name">${process.folderName}</span>
          <span class="process-phase">${process.phase || process.status}</span>
        </div>
        <div class="process-actions">
          <button class="process-btn cancel-btn" data-action="cancel" ${process.status === 'completed' || process.status === 'failed' ? 'disabled' : ''}>
            Cancel
          </button>
        </div>
      </div>
      <div class="process-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <span class="progress-text">${progressPercent}%</span>
      </div>
    `;

    // Add event listeners
    const cancelBtn = element.querySelector('[data-action="cancel"]');
    cancelBtn.addEventListener('click', () => this.cancelProcess(process.taskId));

    return element;
  }

  /**
   * Update a specific process element
   */
  updateProcessElement(taskId, process) {
    if (!process.element) return;

    const element = process.element;
    const progressPercent = Math.max(0, Math.min(100, process.progress || 0));

    // Update status icon and class
    element.className = `process-item process-${process.status}`;
    element.querySelector('.process-icon').textContent = this.getStatusIcon(process.status);
    element.querySelector('.process-phase').textContent = process.phase || process.status;

    // Update progress
    const progressFill = element.querySelector('.progress-fill');
    const progressText = element.querySelector('.progress-text');
    progressFill.style.width = `${progressPercent}%`;
    progressText.textContent = `${progressPercent}%`;

    // Update cancel button state
    const cancelBtn = element.querySelector('[data-action="cancel"]');
    cancelBtn.disabled = ['completed', 'failed', 'cancelled'].includes(process.status);
  }

  /**
   * Get status icon for process
   */
  getStatusIcon(status) {
    const icons = {
      queued: '⏳',
      running: '▶️',
      completed: '✅',
      failed: '❌',
      cancelled: '🛑',
      initializing: '🔄'
    };
    return icons[status] || '❓';
  }

  /**
   * Extract folder name from path
   */
  extractFolderName(folderPath) {
    if (!folderPath) return 'Unknown';
    return folderPath.split(/[/\\]/).pop() || folderPath;
  }

  /**
   * Update process control buttons state
   */
  updateProcessControlButtons() {
    const hasRunning = Array.from(this.activeProcesses.values()).some(p => p.status === 'running');
    const hasQueued = Array.from(this.activeProcesses.values()).some(p => p.status === 'queued');
    const hasActive = hasRunning || hasQueued;

    document.getElementById('pause-all').disabled = !hasRunning;
    document.getElementById('resume-all').disabled = !hasQueued;
    document.getElementById('cancel-all').disabled = !hasActive;
  }

  /**
   * Cancel a specific process
   */
  async cancelProcess(taskId) {
    try {
      const result = await window.electronAPI.cancelParallelUpload(taskId);
      if (result) {
        this.addLogMessage({
          timestamp: new Date().toLocaleTimeString(),
          level: 'warning',
          message: `🛑 Cancelled upload: ${this.activeProcesses.get(taskId)?.folderName || taskId}`
        });
      }
    } catch (error) {
      console.error('Failed to cancel process:', error);
    }
  }

  /**
   * Pause all processes (placeholder - not implemented in worker)
   */
  async pauseAllProcesses() {
    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '⏸️ Pause functionality not implemented yet'
    });
  }

  /**
   * Resume all processes (placeholder - not implemented in worker)
   */
  async resumeAllProcesses() {
    this.addLogMessage({
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '▶️ Resume functionality not implemented yet'
    });
  }

  /**
   * Cancel all processes
   */
  async cancelAllProcesses() {
    if (!confirm('Are you sure you want to cancel all running uploads? This cannot be undone.')) {
      return;
    }

    try {
      const result = await window.electronAPI.cancelAllParallelUploads();

      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'warning',
        message: `🛑 Cancelled ${result.cancelledCount} parallel uploads`
      });

      // Clear process list after a delay
      setTimeout(() => {
        this.hideProcessControls();
        this.activeProcesses.clear();
      }, 2000);

    } catch (error) {
      console.error('Failed to cancel all processes:', error);
      this.addLogMessage({
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: `❌ Failed to cancel processes: ${error.message}`
      });
    }
  }
}

// Initialize the GUI when the script loads
new UploadGUI();