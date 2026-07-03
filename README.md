<div align="center">
  <img src="icon.png" alt="AT Youtube Downloader Logo" width="120"/>
  <h1>AT Youtube Downloader</h1>
  <p><em>تحميل يوتيوب بصيغة MP3 و MP4 بضغطة زر</em></p>

  <img src="https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/PyQt6-UI-green?logo=qt" />
  <img src="https://img.shields.io/badge/yt--dlp-Powered-red?logo=youtube" />
  <img src="https://img.shields.io/badge/Platform-Windows-lightgrey?logo=windows" />
</div>

---

## 📌 نبذة عن البرنامج

**AT Youtube Downloader** هو تطبيق سطح مكتب احترافي مبني بـ **Python** و **PyQt6**، يتيح للمستخدم تحميل مقاطع يوتيوب بجودة عالية بصيغة **MP3 (صوت)** أو **MP4 (فيديو)** عبر واجهة رسومية أنيقة وسهلة الاستخدام.

---

## ✨ المميزات

- 🎵 تحميل الصوت بصيغة **MP3** بجودة 192kbps
- 🎬 تحميل الفيديو بصيغة **MP4** بأعلى جودة متاحة
- 📋 اكتشاف رابط يوتيوب تلقائياً من الـ Clipboard
- 📂 اختيار مكان الحفظ بحرية
- 🌙 واجهة داكنة (Dark Mode) حديثة
- ⚡ التحميل في الخلفية دون تجميد الواجهة

---

## 📸 واجهة البرنامج

> الواجهة الرئيسية بتصميم داكن أنيق مع شريط تقدم

---

## 🚀 التثبيت والتشغيل

### المتطلبات

```
Python 3.10+
ffmpeg  (مطلوب لتحويل MP3)
```

### تثبيت المكتبات

```bash
pip install PyQt6 yt-dlp pyperclip
```

> ⚠️ تأكد من تثبيت **ffmpeg** وإضافته لمتغير البيئة `PATH`  
> تحميل ffmpeg: https://ffmpeg.org/download.html

### تشغيل البرنامج

```bash
python "MP3 Downloader.py"
```

---

## 📦 تشغيل النسخة الجاهزة (EXE)

لا تحتاج لتثبيت Python — قم بتحميل النسخة المجمّعة من صفحة [Releases](https://github.com/Ahmed-Atef-Tech/Youtube_Downloader/releases) وشغّل الملف مباشرة.

---

## 🛠️ بناء EXE بنفسك (Electron)

```bash
npm install
npm run start        # تشغيل محلي
npm run dist         # بناء ملف EXE
```

---

## 📋 كيفية الاستخدام

1. افتح البرنامج
2. الصق رابط يوتيوب (أو سيُكتشف تلقائياً)
3. اختر الصيغة: **MP3** أو **MP4** أو كليهما
4. اضغط **"اختيار مكان الحفظ وبدء التنزيل"**
5. اختر مجلد الحفظ وانتظر اكتمال التحميل ✅

---

## 🔧 استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| خطأ 403 Forbidden | `pip install -U yt-dlp` |
| لا يتحول الملف لـ MP3 | تأكد من تثبيت ffmpeg وإضافته للـ PATH |
| البرنامج لا يفتح | تأكد من تثبيت PyQt6 بشكل صحيح |

---

## 👨‍💻 المطور

**Eng. Ahmed Atef**  
[![GitHub](https://img.shields.io/badge/GitHub-Ahmed--Atef--Tech-black?logo=github)](https://github.com/Ahmed-Atef-Tech)

---

## 📄 الترخيص

هذا المشروع مرخص تحت **ISC License** — راجع ملف [LICENSE](LICENSE) للتفاصيل.
