import sys
import os
import threading
import pyperclip
import yt_dlp
from PyQt6.QtWidgets import (QApplication, QWidget, QVBoxLayout, QLabel, 
                             QLineEdit, QPushButton, QFileDialog, QMessageBox, 
                             QProgressBar, QHBoxLayout, QCheckBox)
from PyQt6.QtCore import Qt, pyqtSignal, QObject
from PyQt6.QtGui import QIcon
import ctypes # used to pin the app icon in the taskbar

# --- Background worker (Worker Thread) ---
class DownloadWorker(QObject):
    finished = pyqtSignal()
    error = pyqtSignal(str)
    
    def __init__(self, url, folder, download_mp3, download_mp4):
        super().__init__()
        self.url = url
        self.folder = folder
        self.download_mp3 = download_mp3
        self.download_mp4 = download_mp4

    def run(self):
        try:
            common_opts = {
                'quiet': True,
                'no_warnings': True,
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'source_address': '0.0.0.0',
                'extractor_args': {'youtube': {'player_client': ['android', 'web']}}
            }

            if self.download_mp3:
                mp3_opts = common_opts.copy()
                mp3_opts.update({
                    'format': 'bestaudio/best',
                    'postprocessors': [{'key': 'FFmpegExtractAudio','preferredcodec': 'mp3','preferredquality': '192'}],
                    'outtmpl': os.path.join(self.folder, '%(title)s.mp3'),
                })
                with yt_dlp.YoutubeDL(mp3_opts) as ydl:
                    ydl.download([self.url])

            if self.download_mp4:
                mp4_opts = common_opts.copy()
                mp4_opts.update({
                    'format': 'bestvideo+bestaudio/best',
                    'merge_output_format': 'mp4',
                    'outtmpl': os.path.join(self.folder, '%(title)s.mp4'),
                })
                with yt_dlp.YoutubeDL(mp4_opts) as ydl:
                    ydl.download([self.url])
            
            self.finished.emit()
        except Exception as e:
            self.error.emit(str(e))

# --- Main window ---
class ModernDownloader(QWidget):
    def __init__(self):
        super().__init__()
        
        # 1. App name
        self.setWindowTitle("AT Youtube Downloader")
        self.resize(550, 420) # a little taller to fit the name
        self.last_folder = ""

        # 2. App icon (icon.png)
        # makes Windows show this icon in the taskbar
        myappid = 'mycompany.myproduct.subproduct.version' 
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
        
        # icon path
        script_dir = os.path.dirname(os.path.abspath(__file__))
        icon_path = os.path.join(script_dir, 'icon.png')
        
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

        # styling (CSS)
        self.setStyleSheet("""
            QWidget {
                background-color: #202020;
                color: #ffffff;
                font-family: "Segoe UI", sans-serif;
                font-size: 14px;
            }
            QLabel { color: #e0e0e0; }
            QLineEdit {
                background-color: #2d2d2d;
                border: 1px solid #3e3e3e;
                border-radius: 6px;
                padding: 10px;
                color: white;
            }
            QLineEdit:focus { border: 1px solid #0078d4; background-color: #323232; }
            QPushButton {
                background-color: #0078d4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                font-weight: bold;
            }
            QPushButton:hover { background-color: #1084e0; }
            QPushButton:disabled { background-color: #3e3e3e; color: #888888; }
            QPushButton#SecondaryBtn {
                background-color: #3e3e3e;
                border: 1px solid #555;
            }
            QPushButton#SecondaryBtn:hover { background-color: #4e4e4e; }
            QCheckBox { spacing: 10px; color: #ddd; }
            QCheckBox::indicator { width: 18px; height: 18px; }
            QProgressBar {
                border: none;
                background-color: #2d2d2d;
                border-radius: 4px;
                height: 8px;
                text-align: center;
            }
            QProgressBar::chunk { background-color: #0078d4; border-radius: 4px; }
        """)

        self.layout = QVBoxLayout()
        self.layout.setSpacing(12)
        self.layout.setContentsMargins(30, 25, 30, 30)
        self.setLayout(self.layout)

        self.init_ui()
        self.check_clipboard()

    def init_ui(self):
        # main title
        self.title_label = QLabel("YouTube Downloader")
        self.title_label.setStyleSheet("font-size: 24px; font-weight: bold; color: #ffffff; margin-bottom: 0px;")
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.layout.addWidget(self.title_label)

        # 3. developer name (small)
        self.credit_label = QLabel("By Eng. Ahmed Atef")
        self.credit_label.setStyleSheet("""
            font-size: 11px; 
            color: #888888; 
            font-weight: 500; 
            font-style: italic; 
            margin-bottom: 15px;
            letter-spacing: 1px;
        """)
        self.credit_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.layout.addWidget(self.credit_label)

        # status line
        self.status_label = QLabel("Paste a link and choose a format")
        self.status_label.setStyleSheet("color: #aaaaaa; font-size: 13px;")
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.layout.addWidget(self.status_label)

        # link input
        input_layout = QHBoxLayout()
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("https://youtube.com/...")
        input_layout.addWidget(self.url_input)
        
        self.paste_btn = QPushButton("Paste")
        self.paste_btn.setObjectName("SecondaryBtn")
        self.paste_btn.setFixedWidth(70)
        self.paste_btn.clicked.connect(self.paste_link)
        input_layout.addWidget(self.paste_btn)
        self.layout.addLayout(input_layout)

        # format options
        formats_layout = QHBoxLayout()
        formats_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.chk_mp3 = QCheckBox("MP3 (audio)")
        self.chk_mp3.setChecked(True)
        formats_layout.addWidget(self.chk_mp3)

        formats_layout.addSpacing(20)

        self.chk_mp4 = QCheckBox("MP4 (video)")
        formats_layout.addWidget(self.chk_mp4)
        self.layout.addLayout(formats_layout)

        # download button
        self.download_btn = QPushButton("Choose a folder and start downloading")
        self.download_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.download_btn.clicked.connect(self.start_download_process)
        self.layout.addWidget(self.download_btn)

        # open folder button
        self.open_folder_btn = QPushButton("📂 Open downloads folder")
        self.open_folder_btn.setObjectName("SecondaryBtn")
        self.open_folder_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.open_folder_btn.clicked.connect(self.open_current_folder)
        self.open_folder_btn.setEnabled(False)
        self.layout.addWidget(self.open_folder_btn)

        # progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0)
        self.progress_bar.hide()
        self.layout.addWidget(self.progress_bar)

        self.layout.addStretch()

    def check_clipboard(self):
        text = pyperclip.paste().strip()
        if "youtube.com" in text or "youtu.be" in text:
            self.url_input.setText(text)
            self.status_label.setText("Link found. Ready to download.")
            self.status_label.setStyleSheet("color: #00e676;")

    def paste_link(self):
        self.url_input.setText(pyperclip.paste().strip())

    def start_download_process(self):
        url = self.url_input.text().strip()
        if not url:
            QMessageBox.warning(self, "Notice", "Please enter a valid YouTube link.")
            return

        if not self.chk_mp3.isChecked() and not self.chk_mp4.isChecked():
            QMessageBox.warning(self, "Notice", "Please choose at least one format.")
            return

        folder = QFileDialog.getExistingDirectory(self, "Choose where to save")
        if not folder:
            return
        
        self.last_folder = folder
        self.open_folder_btn.setEnabled(True)

        self.toggle_ui_state(False)
        self.status_label.setText("Downloading... please wait")
        self.status_label.setStyleSheet("color: #0078d4;")
        self.progress_bar.show()

        self.thread = QThreadWrapper(url, folder, self.chk_mp3.isChecked(), self.chk_mp4.isChecked())
        self.thread.worker.finished.connect(self.on_download_success)
        self.thread.worker.error.connect(self.on_download_error)
        self.thread.start()

    def on_download_success(self):
        self.toggle_ui_state(True)
        self.status_label.setText("✅ Download complete!")
        self.status_label.setStyleSheet("color: #00e676;")
        self.progress_bar.hide()
        QMessageBox.information(self, "Done", "Files saved successfully.")
        self.open_current_folder()

    def on_download_error(self, err_msg):
        self.toggle_ui_state(True)
        self.status_label.setText("❌ Something went wrong")
        self.status_label.setStyleSheet("color: #ff5252;")
        self.progress_bar.hide()
        
        display_msg = err_msg
        if "403" in err_msg:
            display_msg = "YouTube refused the connection (403 Forbidden).\nUpdate yt-dlp: 'pip install -U yt-dlp'"
        QMessageBox.critical(self, "Download failed", display_msg)

    def open_current_folder(self):
        if self.last_folder and os.path.exists(self.last_folder):
            try:
                os.startfile(self.last_folder)
            except Exception:
                pass

    def toggle_ui_state(self, enabled):
        self.download_btn.setEnabled(enabled)
        self.url_input.setEnabled(enabled)
        self.chk_mp3.setEnabled(enabled)
        self.chk_mp4.setEnabled(enabled)

class QThreadWrapper(threading.Thread):
    def __init__(self, url, folder, dl_mp3, dl_mp4):
        super().__init__()
        self.worker = DownloadWorker(url, folder, dl_mp3, dl_mp4)
    def run(self):
        self.worker.run()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = ModernDownloader()
    window.show()
    sys.exit(app.exec())