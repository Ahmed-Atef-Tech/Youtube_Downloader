const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');

// The installed app carries its own yt-dlp.exe and ffmpeg.exe in resources/bin,
// so people don't need Python or yt-dlp on their PC. In dev it looks in ./bin,
// and falls back to whatever yt-dlp is on PATH.
const BIN_DIR = app.isPackaged ? path.join(process.resourcesPath, 'bin') : path.join(__dirname, 'bin');
const YTDLP = fs.existsSync(path.join(BIN_DIR, 'yt-dlp.exe')) ? path.join(BIN_DIR, 'yt-dlp.exe') : 'yt-dlp';
const FFMPEG_ARGS = fs.existsSync(path.join(BIN_DIR, 'ffmpeg.exe')) ? ['--ffmpeg-location', BIN_DIR] : [];

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 590,
    minWidth: 700,
    minHeight: 520,
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#00000000',
  });

  mainWindow.loadFile('index.html');
  if (!app.isPackaged) { mainWindow.webContents.openDevTools(); mainWindow.webContents.on('console-message', (e, level, msg) => console.log('RENDERER:', msg)); }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

// ══════════════════════════════════════
//  Window Controls
// ══════════════════════════════════════
ipcMain.on('win-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('win-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('win-close', () => {
  if (activeDownload && activeDownload.pid) { try { exec('taskkill /F /T /PID ' + activeDownload.pid); } catch(e){} }
  app.quit();
});

// ══════════════════════════════════════
//  Folder / URL / Clipboard
// ══════════════════════════════════════
ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.on('open-target', (event, target) => {
  if (!target) return;
  if (target.startsWith('http') || target.startsWith('mailto:')) {
    shell.openExternal(target);
  } else if (fs.existsSync(target)) {
    shell.openPath(target);
  }
});

// Clipboard read
ipcMain.handle('read-clipboard', () => {
  try { return clipboard.readText(); } catch(e) { return ''; }
});

// ══════════════════════════════════════
//  yt-dlp check
// ══════════════════════════════════════
ipcMain.handle('check-ytdlp', async () => {
  return new Promise((resolve) => {
    exec(`"${YTDLP}" --version`, (err, stdout) => {
      if (err) {
        exec('python -m yt_dlp --version', (err2, stdout2) => {
          if (err2) resolve({ available: false, version: null });
          else resolve({ available: true, version: stdout2.trim(), cmd: 'python -m yt_dlp' });
        });
      } else {
        resolve({ available: true, version: stdout.trim(), cmd: 'yt-dlp' });
      }
    });
  });
});

// ══════════════════════════════════════
//  Fetch Info  (single video OR playlist)
// ══════════════════════════════════════
ipcMain.handle('fetch-info', async (event, { url, isPlaylist }) => {
  return new Promise((resolve) => {
    const args = isPlaylist
      ? ['--dump-json', '--flat-playlist',
         '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
         '--extractor-args', 'youtube:player_client=android,web', url]
      : ['--dump-json', '--no-playlist',
         '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
         '--extractor-args', 'youtube:player_client=android,web', url];

    const proc = spawn(YTDLP, args);
    let out = '';
    let err = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.stderr.on('data', d => err += d.toString());
    proc.on('close', code => {
      if (code === 0 && out.trim()) {
        try {
          if (isPlaylist) {
            // flat-playlist returns one JSON per line
            const lines = out.trim().split('\n').filter(Boolean);
            const entries = lines.map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
            const first = entries[0] || {};
            resolve({
              ok: true,
              isPlaylist: true,
              title: first.playlist_title || first.playlist || 'Playlist',
              channel: first.uploader || first.channel || '',
              count: entries.length,
              thumbnail: first.thumbnail || (first.thumbnails && first.thumbnails.length ? first.thumbnails[first.thumbnails.length - 1].url : (first.id ? `https://i.ytimg.com/vi/${first.id}/hqdefault.jpg` : '')),
              entries: entries.map(e => ({ id: e.id, title: e.title, duration: e.duration_string || '' }))
            });
          } else {
            const info = JSON.parse(out);
            resolve({
              ok: true,
              isPlaylist: false,
              title: info.title,
              channel: info.uploader || info.channel,
              duration: info.duration_string || formatDuration(info.duration),
              thumbnail: info.thumbnail,
              viewCount: info.view_count,
            });
          }
        } catch(e) {
          resolve({ ok: false, error: 'Parse error: ' + e.message });
        }
      } else {
        // Fallback python
        const pyProc = spawn('python', ['-m', 'yt_dlp', ...args.slice(0, -1), url]);
        let out2 = '', err2 = '';
        pyProc.stdout.on('data', d => out2 += d.toString());
        pyProc.stderr.on('data', d => err2 += d.toString());
        pyProc.on('close', c2 => {
          if (c2 === 0 && out2.trim()) {
            try {
              const info = JSON.parse(out2.split('\n')[0]);
              resolve({ ok: true, isPlaylist: false, title: info.title, channel: info.uploader || '', duration: info.duration_string || '', thumbnail: info.thumbnail, viewCount: info.view_count });
            } catch(e) {
              resolve({ ok: false, error: err2 || 'yt-dlp not found' });
            }
          } else {
            resolve({ ok: false, error: err || err2 || 'yt-dlp not found. Run: pip install yt-dlp' });
          }
        });
        pyProc.on('error', () => resolve({ ok: false, error: 'yt-dlp not found. Run: pip install yt-dlp' }));
      }
    });
    proc.on('error', () => {
      resolve({ ok: false, error: 'yt-dlp not found. Run: pip install yt-dlp' });
    });
  });
});

function formatDuration(secs) {
  if (!secs) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ══════════════════════════════════════
//  Download (single + playlist)
// ══════════════════════════════════════
let activeDownload = null;

ipcMain.handle('start-download', async (event, { url, folder, format, quality, isPlaylist, items }) => {
  return new Promise((resolve) => {

    let args = [
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      '--extractor-args', 'youtube:player_client=android,web',
      '--newline',
      ...FFMPEG_ARGS,
    ];

    // Playlist vs single
    if (isPlaylist) {
      args.push('--yes-playlist');
      if (items && items.length > 0) {
        args.push('--playlist-items', items.join(','));
      }
      args.push('-o', path.join(folder, '%(playlist_index)s - %(title)s.%(ext)s'));
    } else {
      args.push('--no-playlist');
      args.push('-o', path.join(folder, '%(title)s.%(ext)s'));
    }

    // Format
    if (format === 'mp3') {
      args = args.concat([
        '-f', 'bestaudio/best',
        '--extract-audio', '--audio-format', 'mp3',
        '--audio-quality', quality === 'high' ? '0' : quality === 'medium' ? '5' : '9',
        '--no-keep-video'
      ]);
    } else if (format === 'mp4') {
      const res = quality === 'best' ? 'bestvideo+bestaudio/best' : `bestvideo[height<=${quality}]+bestaudio/best`;
      args = args.concat(['-f', res, '--merge-output-format', 'mp4']);
    } else if (format === 'audio') {
      args = args.concat(['-f', 'bestaudio/best', '--extract-audio']);
    } else {
      args = args.concat(['-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4']);
    }

    args.push(url);

    activeDownload = spawn(YTDLP, args);

    // Parse progress + playlist item count
    activeDownload.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        // Playlist item progress: [download] Downloading video 3 of 12
        const itemMatch = line.match(/Downloading (?:video|item) (\d+) of (\d+)/i);
        if (itemMatch) {
          mainWindow.webContents.send('download-progress', {
            type: 'playlist-item',
            current: parseInt(itemMatch[1]),
            total: parseInt(itemMatch[2]),
            percent: Math.round((parseInt(itemMatch[1]) - 1) / parseInt(itemMatch[2]) * 100),
            line: line.trim()
          });
          continue;
        }

        // File percent progress
        const pctMatch = line.match(/(\d+\.?\d*)%/);
        if (pctMatch) {
          mainWindow.webContents.send('download-progress', {
            type: 'percent',
            percent: parseFloat(pctMatch[1]),
            line: line.trim()
          });
        }
      }
    });

    activeDownload.stderr.on('data', (data) => {
      mainWindow.webContents.send('download-log', { text: data.toString().trim() });
    });

    activeDownload.on('close', (code) => {
      activeDownload = null;
      if (code === 0) resolve({ ok: true });
      else resolve({ ok: false, error: `yt-dlp exited with code ${code}` });
    });

    activeDownload.on('error', () => {
      // fallback python
      const pyArgs = ['-m', 'yt_dlp', ...args];
      activeDownload = spawn('python', pyArgs);
      activeDownload.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const itemMatch = line.match(/Downloading (?:video|item) (\d+) of (\d+)/i);
          if (itemMatch) {
            mainWindow.webContents.send('download-progress', { type: 'playlist-item', current: parseInt(itemMatch[1]), total: parseInt(itemMatch[2]), percent: Math.round((parseInt(itemMatch[1]) - 1) / parseInt(itemMatch[2]) * 100), line: line.trim() });
            continue;
          }
          const pctMatch = line.match(/(\d+\.?\d*)%/);
          if (pctMatch) {
            mainWindow.webContents.send('download-progress', { type: 'percent', percent: parseFloat(pctMatch[1]), line: line.trim() });
          }
        }
      });
      activeDownload.on('close', (c) => { activeDownload = null; if (c === 0) resolve({ ok: true }); else resolve({ ok: false, error: 'yt-dlp not found. Run: pip install yt-dlp' }); });
      activeDownload.on('error', () => resolve({ ok: false, error: 'yt-dlp not found. Run: pip install yt-dlp' }));
    });
  });
});

ipcMain.on('cancel-download', () => {
  if (activeDownload && activeDownload.pid) {
    try { exec('taskkill /F /T /PID ' + activeDownload.pid); } catch(e){}
    activeDownload = null;
  }
});
