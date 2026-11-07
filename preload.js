const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize:      () => ipcRenderer.send('win-minimize'),
  maximize:      () => ipcRenderer.send('win-maximize'),
  close:         () => ipcRenderer.send('win-close'),

  pickFolder:    () => ipcRenderer.invoke('pick-folder'),
  openTarget:    (t) => ipcRenderer.send('open-target', t),

  readClipboard: () => ipcRenderer.invoke('read-clipboard'),

  checkYtdlp:   () => ipcRenderer.invoke('check-ytdlp'),
  fetchInfo:    (url, isPlaylist) => ipcRenderer.invoke('fetch-info', { url, isPlaylist }),
  startDownload: (opts) => ipcRenderer.invoke('start-download', opts),
  cancelDownload: () => ipcRenderer.send('cancel-download'),

  onProgress:   (cb) => ipcRenderer.on('download-progress', (_, d) => cb(d)),
  onLog:        (cb) => ipcRenderer.on('download-log',      (_, d) => cb(d)),
  removeAll:    (ch) => { if(['download-progress', 'download-log'].includes(ch)) ipcRenderer.removeAllListeners(ch); },
});
