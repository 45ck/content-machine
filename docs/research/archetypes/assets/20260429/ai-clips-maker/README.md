# 🎬 ai-clips-maker  
> **Created by Alperen Sümeroğlu** — An AI-native video engine that turns long-form content into short, viral-ready clips with surgical precision.  

`ai-clips-maker` is a smart, modular Python tool built for **creators, educators, and developers**. It transcribes speech, detects speakers, analyzes scenes, and crops around the key moments — creating **ready-to-share vertical clips** for TikTok, Reels, and Shorts with zero manual editing.

---

## 📚 Contents  
- [📦 Features](#-features)  
- [🛠 Installation](#-installation)  
- [🚀 Quickstart](#-quickstart)  
- [🔍 How It Works](#-how-it-works)  
- [⚙️ Tech Stack](#-tech-stack)  
- [🎯 Use Cases](#-use-cases)  
- [🧪 Tests](#-tests)  
- [🗺 Roadmap](#-roadmap)  
- [🤝 Contribute](#-contribute)  
- [👤 Author](#-author)  
- [🎧 Weekly Rewind Podcast](#-weekly-rewind-podcast)  
- [📄 License](#-license)

---

## 📦 Features  
- 🎞️ Auto-segment videos based on speech & scene shifts  
- 🧠 Word-level transcription using WhisperX  
- 🗣️ Speaker diarization (who spoke when) via Pyannote  
- 🪄 Face/body-aware cropping focused on active speaker  
- 📐 Output formats: 9:16 (vertical), 1:1 (square), 16:9 (wide)  
- 🔌 Modular and easily extensible pipeline

---

## 🛠 Installation  

```bash
# Install main package
pip install ai-clips-maker

# Install WhisperX from source
pip install git+https://github.com/m-bain/whisperx.git

# Install dependencies
# macOS
brew install libmagic ffmpeg

# Ubuntu/Debian
sudo apt install libmagic1 ffmpeg
```

---

## 🚀 Quickstart  

```python
from ai_clips_maker import Transcriber, ClipFinder, resize

# Step 1: Transcription
transcriber = Transcriber()
transcription = transcriber.transcribe(audio_file_path="/path/to/video.mp4")

# Step 2: Clip detection
clip_finder = ClipFinder()
clips = clip_finder.find_clips(transcription=transcription)
print(clips[0].start_time, clips[0].end_time)

# Step 3: Cropping & resizing
crops = resize(
    video_file_path="/path/to/video.mp4",
    pyannote_auth_token="your_huggingface_token",
    aspect_ratio=(9, 16)
)
print(crops.segments)
```

---

## 🔍 How It Works  
1. 🎧 Extracts audio from video  
2. ✍️ Transcribes speech using WhisperX  
3. 🧍 Identifies speakers with Pyannote  
4. 🎬 Detects scene changes & speaker shifts  
5. 🎯 Crops video around active speaker’s position  
6. 📤 Exports clips in desired format  

---

## ⚙️ Tech Stack  

| 🔧 Module         | 🧠 Technology                                     | 💡 Purpose                                              |
|------------------|---------------------------------------------------|----------------------------------------------------------|
| Transcription     | [WhisperX](https://github.com/m-bain/whisperx)   | Word-level speech-to-text with timestamps               |
| Diarization       | [Pyannote.audio](https://github.com/pyannote/pyannote-audio) | Speaker segmentation (who spoke when)              |
| Video Processing  | [OpenCV](https://opencv.org/), [PyAV](https://github.com/PyAV-Org/PyAV) | Frame-by-frame video control        |
| Scene Detection   | [Scenedetect](https://github.com/Breakthrough/PySceneDetect) | Detects shot boundaries                                 |
| ML Inference      | [PyTorch](https://pytorch.org/)                  | Powering WhisperX & Pyannote models                     |
| Data Handling     | [NumPy](https://numpy.org/), [Pandas](https://pandas.pydata.org/) | Transcription & clip structuring              |
| Media Utilities   | [ffmpeg](https://ffmpeg.org/), [libmagic](https://linux.die.net/man/3/libmagic) | Media decoding + type detection      |
| Testing Framework | [pytest](https://docs.pytest.org/)              | End-to-end and unit testing support                     |

> All tools were selected for speed, flexibility, and production-grade stability.

---

## 🎯 Use Cases  
- 🎙 **Podcasters** clipping episodes into shareable highlights  
- 📚 **Teachers** summarizing lecture content  
- 📱 **Social media teams** repurposing YouTube for Reels  
- 🧠 **Developers** automating video workflows  
- 🚀 **Startups** building AI-based content tools

---

## 🧪 Tests  

```bash
# Run test suite
pytest tests/
```

> Covers all components: transcriber, diarizer, clip detector, resizer.

---

## 🗺 Roadmap  

| Status | Feature                                            | Note                         |
|--------|----------------------------------------------------|------------------------------|
| ✅     | Core pipeline: Transcribe → Diarize → Detect       | Implemented in v1.0          |
| ✅     | Speaker-aware video cropping                       | Production ready             |
| 🚧     | Multi-language subtitle generation                 | Planned for Q2 2025          |
| 📌     | Auto-caption overlay                               | In design phase              |
| 🧪     | Web UI (upload + preview clips)                    | Prototype in progress        |
| 🧠     | HuggingFace or Streamlit live demo                 | On backlog                   |

---

## 🤝 Contribute  

We welcome pull requests, ideas, and feedback.

```bash
# Fork the repo
git clone https://github.com/alperensumeroglu/ai-clips-maker.git
cd ai-clips-maker

# Create feature branch
git checkout -b feat/your-feature

# Make changes, commit, and push
git commit -am "Add feature"
git push origin feat/your-feature
```

Before contributing, please review open issues and coding style guide.

---

## 👤 Author  

**Alperen Sümeroğlu**  
Computer Engineer • Entrepreneur • World Explorer 🌍  
15+ European countries explored ✈️

- 🔗 [LinkedIn](https://www.linkedin.com/in/alperensumeroglu/)  
- 🧠 [LeetCode](https://leetcode.com/u/alperensumeroglu/)  
- 🚀 [Daily.dev](https://app.daily.dev/alperensumeroglu)  

> *“Let your code tell your story — clean, powerful, and useful.”*

---

## 🎧 Weekly Rewind Podcast  

🎤 Weekly insights on AI, tech, and building globally — by Alperen Sümeroğlu.

> 🚀 What does it take to grow as a Computer Engineering student, build projects, and explore global innovation?

This API is part of a bigger journey I share in **Weekly Rewind** — my real-time documentary **podcast series**, where I reflect weekly on coding breakthroughs, innovation insights, startup stories, and lessons from around the world.

### 💡 What is Weekly Rewind?
A behind-the-scenes look at real-world experiences, global insights, and hands-on learning. Each episode includes:

- 🔹 Inside My Coding & Engineering Projects  
- 🔹 Startup Ideas & Entrepreneurial Lessons  
- 🔹 Trends in Tech & AI  
- 🔹 Innovation from 15+ Countries  
- 🔹 Guest Conversations with Builders & Engineers  
- 🔹 Productivity, Learning & Growth Strategies  

**🎧 Listen now:**  
- [Spotify](https://open.spotify.com/show/3Lc5ofiXh93wYI8Sx7MFCK)  
- [YouTube](https://www.youtube.com/playlist?list=PLSN_hxkfsxbbd_qD87kn1SVvnR41IbuGc)  
- [Medium](https://medium.com/@alperensumeroglu)  
- [LinkedIn](https://www.linkedin.com/company/weekly-rewind-tech-ai-entrepreneurship-podcast/)  

> *“True learning isn’t in tutorials — it’s in building, exploring, and reflecting.”*

---

## 📄 License  

MIT License — Free for commercial and personal use.  
© 2024 Alperen Sümeroğlu
