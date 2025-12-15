const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    closeMainWindow: () => ipcRenderer.send('close-main-window'),
    openMainWindow: () => ipcRenderer.send('open-main-window'),
    handleFloatBallClick: () => ipcRenderer.send('handle-float-ball-click'),
    moveWindow: (delta) => ipcRenderer.send('move-float-window', delta),
    toggleFloatBall: (enable) => ipcRenderer.send('toggle-float-ball', enable),
    reloadFloatBall: () => ipcRenderer.send('reload-float-ball'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
    setAutoStart: (enable) => ipcRenderer.send('set-auto-start', enable),
    resizeMainWindow: (width, height, animate) => ipcRenderer.send('resize-main-window', width, height, animate),

    onSpinFromFloat: (callback) => ipcRenderer.on('spin-from-float', () => callback()),

    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, value) => callback(value)),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_event, value) => callback(value)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (_event, value) => callback(value)),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (_event, value) => callback(value)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, value) => callback(value)),
    startDownload: () => ipcRenderer.send('start-download'),
    quitAndInstall: () => ipcRenderer.send('quit-and-install'),
    closeUpdaterWindow: () => ipcRenderer.send('close-updater-window'),
    openUpdaterWindow: () => ipcRenderer.send('open-updater-window'),
    getCurrentVersion: () => ipcRenderer.invoke('get-current-version'),
    checkUpdate: () => ipcRenderer.send('check-update'),
    openStatsWindow: (presetName) => ipcRenderer.send('open-stats-window', presetName),
    closeStatsWindow: () => ipcRenderer.send('close-stats-window'),
});