const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Folder selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  validatePath: (path) => ipcRenderer.invoke('validate-path', path),

  // Excel preparation
  prepareExcel: (folderPath) => ipcRenderer.invoke('prepare-excel', folderPath),
  prepareExcelBatch: (folderPath) => ipcRenderer.invoke('prepare-excel-batch', folderPath),

  // Upload execution
  executeUpload: (folderPath) => ipcRenderer.invoke('execute-upload', folderPath),
  executeUploadBatch: (folderPath) => ipcRenderer.invoke('execute-upload-batch', folderPath),

  // Excel bulk edit
  excelBulkEdit: (folderPath, fieldName, fieldValue, dryRun) =>
    ipcRenderer.invoke('excel-bulk-edit', folderPath, fieldName, fieldValue, dryRun),

  // Parallel upload execution
  executeUploadBatchParallel: (folderPath, maxConcurrent) =>
    ipcRenderer.invoke('execute-upload-batch-parallel', folderPath, maxConcurrent),
  getParallelUploadStatus: () => ipcRenderer.invoke('get-parallel-upload-status'),
  cancelAllParallelUploads: () => ipcRenderer.invoke('cancel-all-parallel-uploads'),
  cancelParallelUpload: (taskId) => ipcRenderer.invoke('cancel-parallel-upload', taskId),

  // Parallel configuration
  updateParallelConfig: (config) => ipcRenderer.invoke('update-parallel-config', config),
  getParallelConfig: () => ipcRenderer.invoke('get-parallel-config'),

  // Configuration management
  reloadConfig: () => ipcRenderer.invoke('reload-config'),
  selectConfig: () => ipcRenderer.invoke('select-config'),

  // Event listeners for log messages
  onLogMessage: (callback) => {
    ipcRenderer.on('log-message', (event, data) => callback(data));
  },

  // Event listeners for config updates
  onConfigLoaded: (callback) => {
    ipcRenderer.on('config-loaded', (event, data) => callback(data));
  },

  // Remove event listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('log-message');
    ipcRenderer.removeAllListeners('config-loaded');
  }
});