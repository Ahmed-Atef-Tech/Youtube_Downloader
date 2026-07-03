const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close'),
    readClipboard: () => ipcRenderer.invoke('read-clipboard'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    openFolder: (folderPath) => ipcRenderer.send('open-folder', folderPath),
    startDownload: (options) => ipcRenderer.send('start-download', options),
    onDownloadStatus: (callback) => ipcRenderer.on('download-status', (_event, value) => callback(value)),
    onDownloadComplete: (callback) => ipcRenderer.on('download-complete', () => callback()),
    onDownloadError: (callback) => ipcRenderer.on('download-error', (_event, error) => callback(error))
});
