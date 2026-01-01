# Research Report: Viralfactory

**Repo:** `Paillat-dev/viralfactory`  
**Location:** `vendor/viralfactory/`  
**Stars:** Growing  
**Language:** Python  
**License:** MIT (likely)

---

## What It Does

**Highly modular** Gradio app for automating social media content production with custom pipelines. Emphasizes modularity and customization.

Handles: scripts, TTS, assets, video/audio backgrounds, and auto-upload to TikTok/YouTube.

## Key Features

| Feature | Details |
|---------|---------|
| **Modular Pipelines** | Custom content creation flows |
| **Script Generation** | AI-powered |
| **TTS** | 🐸TTS (Coqui) - open source |
| **Asset Retrieval** | Video/audio backgrounds |
| **Captions** | Whisper-timestamped |
| **Auto Upload** | TikTok + YouTube |
| **UI** | Gradio web interface |

## Tech Stack

- **Language:** Python
- **Video:** MoviePy
- **TTS:** Coqui TTS (open source) ⭐
- **Transcription:** whisper-timestamped
- **UI:** Gradio
- **Package Manager:** PDM

## Requirements

⚠️ Heavy requirements:
- NVIDIA GPU with 10GB+ VRAM
- 20GB+ free disk
- CUDA 11.8
- FFmpeg
- Python 3.10

## What We Can Reuse

### ✅ High Value
- **Coqui TTS patterns** - Open source TTS alternative
- **Auto-upload to TikTok/YouTube** - Distribution automation
- **Pipeline modularity** - Engine composition patterns
- **whisper-timestamped** - Word-level timing

### ⚠️ Medium Value
- **Gradio patterns** - UI reference (if we add web UI)

### ❌ Not Needed
- **GPU requirements** - We want CPU-friendly
- **Full pipeline** - Different architecture

## How It Helps Us

1. **Coqui TTS** - Free, open-source TTS alternative
2. **Auto-upload** - Platform distribution automation
3. **whisper-timestamped** - Word-level caption timing
4. **Modular pipelines** - Composable architecture patterns

## Key Files to Study

```
viralfactory/
├── engines/              # Pipeline engines ⭐
├── tts/
│   └── coqui.py         # Coqui TTS ⭐
├── upload/
│   ├── tiktok.py        # TikTok upload ⭐
│   └── youtube.py       # YouTube upload ⭐
└── captions/
    └── whisper.py       # Transcription
```

## Gaps / Limitations

- Heavy GPU requirements (10GB VRAM)
- Python only
- MoviePy-based
- Complex setup

---

## Verdict

**Value: MEDIUM-HIGH** - The auto-upload to TikTok/YouTube is valuable for distribution. Coqui TTS is an interesting open-source alternative. GPU requirements are a concern.
