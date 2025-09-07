const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    startAnalysis: (paths, options) => ipcRenderer.invoke('start-analysis', paths, options),
    onAnalysisProgress: (callback) => {
        ipcRenderer.on('analysis-progress', (event, data) => callback(data));
    },
    removeAnalysisProgressListener: () => {
        ipcRenderer.removeAllListeners('analysis-progress');
    }
});