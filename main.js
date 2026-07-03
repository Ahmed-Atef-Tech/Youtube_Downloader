const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const youtubedl = require('youtube-dl-exec');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 550,
        height: 480,
        titleBarStyle: 'hidden',
        titleBarOverlay: false,
        frame: false,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Window Controls
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-close', () => mainWindow.close());

// Clipboard
ipcMain.handle('read-clipboard', () => {
    return clipboard.readText();
});

// Select Folder
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'اختر مكان الحفظ'
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

// Open Folder
ipcMain.on('open-folder', (event, folderPath) => {
    if (folderPath && fs.existsSync(folderPath)) {
        shell.openPath(folderPath);
    }
});

// Download Video
ipcMain.on('start-download', async (event, { url, folder, download_mp3, download_mp4 }) => {
    try {
        if (download_mp3) {
            event.reply('download-status', 'جاري تنزيل الصوت (MP3)...');
            await youtubedl(url, {
                extractAudio: true,
                audioFormat: 'mp3',
                output: path.join(folder, '%(title)s.%(ext)s'),
                noWarnings: true
            });
        }

        if (download_mp4) {
            event.reply('download-status', 'جاري تنزيل الفيديو (MP4)...');
            await youtubedl(url, {
                format: 'bestvideo+bestaudio/best',
                mergeOutputFormat: 'mp4',
                output: path.join(folder, '%(title)s.%(ext)s'),
                noWarnings: true
            });
        }

        event.reply('download-complete');
    } catch (error) {
        let msg = error.message;
        if (msg.includes('403')) {
            msg = "رفض يوتيوب الاتصال (403 Forbidden).";
        }
        event.reply('download-error', msg);
    }
});
