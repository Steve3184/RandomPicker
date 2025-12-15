const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

const store = new Store();

let mainWindow;
let floatWindow;
let statsWindow;
let tray;
let ballDiameter;
let updaterWindow;

const autoDownloadEnabled = store.get('autoCheckUpdate', true);
autoUpdater.autoDownload = autoDownloadEnabled;

function setUpdateURL() {
    const updateServer = store.get('updateServer', 'https://cloud2.s3.fan:27777/updater/top.steve3184.randompicker');
    const customUpdateServerUrl = store.get('customUpdateServerUrl', '');

    let feedURL = '';
    if (updateServer === 'custom') {
        feedURL = customUpdateServerUrl;
    } else {
        feedURL = updateServer;
    }

    if (feedURL) {
        console.log('settings feedurl:', feedURL);
        autoUpdater.setFeedURL({
            provider: 'generic',
            url: feedURL
        });
    }
}

// Set the update URL on startup
setUpdateURL();

function createMainWindow(showOnStart = true) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const windowSize = Math.min(Math.round(height * 0.75), 640);
    const savedPosition = store.get('mainWindowPosition');
    let x, y;

    if (savedPosition) {
        x = savedPosition.x;
        y = savedPosition.y;
    } else {
        x = Math.round((width - windowSize * 0.9) / 2);
        y = Math.round((height - windowSize) / 2);
    }
    console.log('create main on pos: x',x,',y',y);
    mainWindow = new BrowserWindow({
        width: windowSize * 0.9,
        height: windowSize,
        x: x,
        y: y,
        minWidth: 576,
        minHeight: 640,
        resizable: true,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.setSkipTaskbar(true);
    mainWindow.loadFile('index.html');

    if (showOnStart) {
        mainWindow.show();
        setTimeout(() => {
            mainWindow.setAlwaysOnTop(true);
            mainWindow.setVisibleOnAllWorkspaces(true);
            mainWindow.setAlwaysOnTop(true, "screen-saver");
            mainWindow.moveTop();
        }, 50);
    } else {
        mainWindow.hide();
    }

    mainWindow.on('move', () => {
        const [x, y] = mainWindow.getPosition();
        store.set('mainWindowPosition', { x, y });
    });

    mainWindow.on('close', (event) => {
        const [x, y] = mainWindow.getPosition();
        store.set('mainWindowPosition', { x, y });
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}

function createFloatWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.size;
    ballDiameter = Math.round(screenHeight * 0.04);

    const savedPosition = store.get('floatBallPosition');
    let x, y;

    if (savedPosition) {
        x = savedPosition.x;
        y = savedPosition.y;
    } else {
        x = Math.round(screenWidth * 0.8);
        y = Math.round(screenHeight * 0.9);
    }
    console.log('create float ball on pos: x',x,',y',y);
    floatWindow = new BrowserWindow({
        width: ballDiameter,
        height: ballDiameter,
        x: x,
        y: y,
        frame: false,
        resizable: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    floatWindow.setSkipTaskbar(true);
    floatWindow.loadFile('float.html');
    const enableFloatBall = store.get('enableFloatBall', false);
    if (enableFloatBall) {
        floatWindow.show();
        setTimeout(() => {
            floatWindow.setAlwaysOnTop(true);
            floatWindow.setVisibleOnAllWorkspaces(true);
            floatWindow.setAlwaysOnTop(true, "screen-saver");
            floatWindow.moveTop();
        }, 50);
    } else {
        floatWindow.hide();
    }
}

function createUpdaterWindow() {
    if (updaterWindow) {
        updaterWindow.show();
        return;
    }
    updaterWindow = new BrowserWindow({
        width: 400,
        height: 300,
        resizable: false,
        frame: false,
        transparent: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    updaterWindow.loadFile('updater.html');
    updaterWindow.on('closed', () => {
        updaterWindow = null;
    });
}

function createStatsWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const windowWidth = 800;
    const windowHeight = 600;

    let x, y;
    const savedPosition = store.get('statsWindowPosition');

    if (savedPosition) {
        x = savedPosition.x;
        y = savedPosition.y;
    } else {
        x = Math.round((width - windowWidth) / 2);
        y = Math.round((height - windowHeight) / 2);
    }

    statsWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: x,
        y: y,
        minWidth: 600,
        minHeight: 400,
        resizable: true,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    statsWindow.setSkipTaskbar(true);
    statsWindow.loadFile(`stats.html`);

    statsWindow.on('move', () => {
        const position = statsWindow.getPosition();
        store.set('statsWindowPosition', { x: position[0], y: position[1] });
    });

    statsWindow.on('close', () => {
        const position = statsWindow.getPosition();
        store.set('statsWindowPosition', { x: position[0], y: position[1] });
        statsWindow = null;
    });

    statsWindow.show();
    setTimeout(() => {
        statsWindow.setAlwaysOnTop(true);
        statsWindow.setVisibleOnAllWorkspaces(true);
        statsWindow.setAlwaysOnTop(true, "screen-saver");
        statsWindow.moveTop();
    }, 50);
}

function createTray() {
    tray = new Tray(path.join(__dirname, 'icon.png'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '打开主界面',
            click: () => mainWindow.show()
        },
        {
            label: '开启/关闭悬浮球',
            click: () => {
                if (floatWindow.isVisible()) {
                    floatWindow.hide();
                } else {
                    floatWindow.reload();
                    floatWindow.show();
                }
            }
        },
        {
            label: '检查更新',
            click: () => {
                autoUpdater.checkForUpdates();
                createUpdaterWindow();
            }
        },
        {
            label: '退出',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);
    tray.setToolTip('随机抽选');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            setTimeout(() => {
                mainWindow.setAlwaysOnTop(true);
                mainWindow.setVisibleOnAllWorkspaces(true);
                mainWindow.setAlwaysOnTop(true, "screen-saver");
                mainWindow.moveTop();
            }, 50);
        }
    });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
        }
    });

    app.on('ready', async () => {
        const { wasOpenedAtLogin } = app.getLoginItemSettings();
        createMainWindow(!wasOpenedAtLogin);
        createFloatWindow();
        createTray();

        const autoStartEnabled = store.get('autoStart', false);
        app.setLoginItemSettings({
            openAtLogin: autoStartEnabled,
        });

        const enableFloatBall = store.get('enableFloatBall', false);
        if (enableFloatBall && floatWindow) {
            floatWindow.show();
        }
        
        const autoCheckUpdateEnabled = store.get('autoCheckUpdate', true);
        if (autoCheckUpdateEnabled) {
            console.log('checking for updates...');
            autoUpdater.checkForUpdates();
        }
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

autoUpdater.on('update-available', (info) => {
    createUpdaterWindow();
    updaterWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    if (updaterWindow) {
        updaterWindow.webContents.send('update-not-available', info);
    }
});

autoUpdater.on('error', (err) => {
    if (updaterWindow) {
        updaterWindow.webContents.send('update-error', err);
    }
});

autoUpdater.on('download-progress', (progressObj) => {
    if (updaterWindow) {
        updaterWindow.webContents.send('download-progress', progressObj);
    }
});

autoUpdater.on('update-downloaded', (info) => {
    createUpdaterWindow();
    if (updaterWindow) {
        updaterWindow.webContents.send('update-downloaded', info);
    }
});

ipcMain.on('start-download', () => {
    autoUpdater.downloadUpdate();
});

ipcMain.on('quit-and-install', () => {
    autoUpdater.quitAndInstall();
});

ipcMain.on('close-updater-window', () => {
    if (updaterWindow) {
        updaterWindow.close();
    }
});

ipcMain.on('open-updater-window', () => {
    autoUpdater.checkForUpdates();
    createUpdaterWindow();
});

ipcMain.handle('get-current-version', () => {
    return require('./package.json').version;
});

ipcMain.on('check-update', () => {
    autoUpdater.checkForUpdates();
});

ipcMain.on('close-main-window', () => {
    try {
        mainWindow.hide();
    } catch (error) {
        console.error('Error in close-main-window:', error);
    }
});

ipcMain.on('handle-float-ball-click', () => {
    if (mainWindow && mainWindow.isVisible()) {
        mainWindow.webContents.send('spin-from-float');
    } else {
        mainWindow.show();
    }
});

ipcMain.on('open-main-window', () => {
    try {
        if (mainWindow) {
            mainWindow.show();
            setTimeout(() => {
                mainWindow.setAlwaysOnTop(true);
                mainWindow.setVisibleOnAllWorkspaces(true);
                mainWindow.setAlwaysOnTop(true, "screen-saver");
                mainWindow.moveTop();
            }, 50);
        }
    } catch (error) {
        console.error('Error in open-main-window:', error);
    }
});

ipcMain.on('resize-main-window', (event, { width, height, animate }) => {
    try {
        if (mainWindow) {
            const currentBounds = mainWindow.getBounds();
            const newWidth = width || currentBounds.width;
            const newHeight = height || currentBounds.height;
            mainWindow.setBounds({ x: currentBounds.x, y: currentBounds.y, width: newWidth, height: newHeight }, animate);
        }
    } catch (error) {
        console.error('Error in resize-main-window:', error, { width, height, animate });
    }
});

ipcMain.on('move-float-window', (event, { deltaX, deltaY }) => {
    try {
        const [currentX, currentY] = floatWindow.getPosition();
        const display = screen.getDisplayNearestPoint({ x: currentX, y: currentY });
        const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } = display.workArea;

        let newX = Math.round(currentX + deltaX);
        let newY = Math.round(currentY + deltaY);

        newX = Math.max(displayX, Math.min(newX, displayX + displayWidth - ballDiameter));
        newY = Math.max(displayY, Math.min(newY, displayY + displayHeight - ballDiameter));
        
        floatWindow.setBounds({ x: newX, y: newY, height: ballDiameter, width: ballDiameter });
        store.set('floatBallPosition', { x: newX, y: newY });
    } catch (error) {
        console.error('Error in move-float-window:', error, { deltaX, deltaY });
    }
});

ipcMain.on('toggle-float-ball', (event, enable) => {
    try {
        if (floatWindow) {
            if (enable) {
                floatWindow.show();
                setTimeout(() => {
                    floatWindow.setAlwaysOnTop(true);
                    floatWindow.setVisibleOnAllWorkspaces(true);
                    floatWindow.setAlwaysOnTop(true, "screen-saver");
                    floatWindow.moveTop();
                }, 50);
            } else {
                floatWindow.hide();
            }
        }
    } catch (error) {
        console.error('Error in toggle-float-ball:', error, { enable });
    }
});

ipcMain.on('reload-float-ball', () => {
    try {
        if (floatWindow) {
            floatWindow.reload();
        }
    } catch (error) {
        console.error('Error in reload-float-ball:', error);
    }
});

ipcMain.handle('get-settings', () => {
    try {
        return store.store;
    } catch (error) {
        console.error('Error in get-settings:', error);
        return {};
    }
});

ipcMain.on('save-settings', (event, settings) => {
    try {
        store.set(settings);
        if (settings.updateServer || settings.customUpdateServerUrl) {
            setUpdateURL();
        }
    } catch (error) {
        console.error('Error in save-settings:', error, { settings });
    }
});

ipcMain.on('set-auto-start', (event, enable) => {
    try {
        app.setLoginItemSettings({
            openAtLogin: enable,
        });
        store.set('autoStart', enable);
    } catch (error) {
        console.error('Error in set-auto-start:', error, { enable });
    }
});

ipcMain.on('open-stats-window', () => {
    try {
        if (statsWindow) {
            statsWindow.reload();
            statsWindow.focus();
        } else {
            createStatsWindow();
        }
    } catch (error) {
        console.error('Error in open-stats-window:', error);
    }
});

ipcMain.on('close-stats-window', () => {
    try {
        if (statsWindow) {
            statsWindow.close();
        }
    } catch (error) {
        console.error('Error in close-stats-window:', error);
    }
});