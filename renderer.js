document.addEventListener('DOMContentLoaded', async () => {
    // Window controls
    document.getElementById('btn-minimize').addEventListener('click', () => {
        window.electronAPI.minimize();
    });
    
    document.getElementById('btn-close').addEventListener('click', () => {
        window.electronAPI.close();
    });

    // UI Elements
    const urlInput = document.getElementById('url-input');
    const pasteBtn = document.getElementById('paste-btn');
    const chkMp3 = document.getElementById('chk-mp3');
    const chkMp4 = document.getElementById('chk-mp4');
    const downloadBtn = document.getElementById('download-btn');
    const openFolderBtn = document.getElementById('open-folder-btn');
    const statusLabel = document.getElementById('status-label');
    const progressContainer = document.getElementById('progress-container');

    let currentFolder = null;

    // Auto-paste clipboard
    const clipText = await window.electronAPI.readClipboard();
    if (clipText && (clipText.includes('youtube.com') || clipText.includes('youtu.be'))) {
        urlInput.value = clipText;
        statusLabel.textContent = "تم اكتشاف رابط! جاهز للتنزيل.";
        statusLabel.style.color = "var(--accent)";
    }

    pasteBtn.addEventListener('click', async () => {
        const text = await window.electronAPI.readClipboard();
        urlInput.value = text;
    });

    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            alert("الرجاء إدخال رابط يوتيوب صالح.");
            return;
        }

        const downloadMp3 = chkMp3.checked;
        const downloadMp4 = chkMp4.checked;

        if (!downloadMp3 && !downloadMp4) {
            alert("الرجاء اختيار صيغة واحدة على الأقل.");
            return;
        }

        const folder = await window.electronAPI.selectFolder();
        if (!folder) return; // User canceled dialog

        currentFolder = folder;
        
        // Update UI for downloading state
        setUiState(false);
        progressContainer.classList.remove('hidden');
        statusLabel.textContent = "جاري التنزيل... يرجى الانتظار";
        statusLabel.style.color = "var(--accent)";
        
        window.electronAPI.startDownload({
            url: url,
            folder: folder,
            download_mp3: downloadMp3,
            download_mp4: downloadMp4
        });
    });

    openFolderBtn.addEventListener('click', () => {
        if (currentFolder) {
            window.electronAPI.openFolder(currentFolder);
        }
    });

    // Listen to IPC events
    window.electronAPI.onDownloadStatus((statusMsg) => {
        statusLabel.textContent = statusMsg;
    });

    window.electronAPI.onDownloadComplete(() => {
        setUiState(true);
        progressContainer.classList.add('hidden');
        statusLabel.textContent = "✅ تم التنزيل بنجاح!";
        statusLabel.style.color = "var(--accent)";
        openFolderBtn.classList.remove('hidden');
    });

    window.electronAPI.onDownloadError((errorMsg) => {
        setUiState(true);
        progressContainer.classList.add('hidden');
        statusLabel.textContent = "❌ حدث خطأ";
        statusLabel.style.color = "var(--red)";
        alert("فشل التنزيل:\n" + errorMsg);
    });

    function setUiState(enabled) {
        urlInput.disabled = !enabled;
        pasteBtn.disabled = !enabled;
        chkMp3.disabled = !enabled;
        chkMp4.disabled = !enabled;
        downloadBtn.disabled = !enabled;
    }
});
