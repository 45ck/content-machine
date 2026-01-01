# Research Report: MoneyPrinterTurbo

**Repo:** `harry0703/MoneyPrinterTurbo`  
**Location:** `vendor/MoneyPrinterTurbo/`  
**Stars:** 23k+ (very popular)  
**Language:** Python

---

## What It Does

Complete end-to-end short video generation pipeline. You provide a **topic/keyword**, it automatically:

1. Generates video script/copy (AI)
2. Fetches HD video materials (stock footage)
3. Generates subtitles
4. Adds background music
5. Synthesizes final short video

## Key Features

| Feature | Details |
|---------|---------|
| **Architecture** | Full MVC, WebUI + API |
| **Video Sizes** | Portrait 9:16 (1080x1920), Landscape 16:9 (1920x1080) |
| **Batch Generation** | Create multiple videos at once |
| **Voice Synthesis** | Multiple TTS providers with preview |
| **Subtitles** | Font, position, color, size, outline customization |
| **Background Music** | Random or specified, volume adjustable |
| **Stock Footage** | Pexels (HD, royalty-free) or local materials |
| **LLM Support** | OpenAI, Moonshot, Azure, Gemini, Ollama, DeepSeek, Qwen, etc. |

## Tech Stack

- **Backend:** Python, FastAPI
- **Video Processing:** moviepy, FFmpeg
- **TTS:** Azure TTS, OpenAI TTS (planned)
- **Stock Footage:** Pexels API
- **LLM:** Multiple provider support

## What We Can Reuse

### ✅ High Value
- **Script generation prompts** - Battle-tested prompts for engaging copy
- **Pexels integration** - Stock footage fetching logic
- **Subtitle positioning/styling** - Font, color, outline logic
- **Video clip duration logic** - Material switching frequency
- **MVC architecture patterns** - API design reference

### ⚠️ Medium Value
- **Voice synthesis abstraction** - Multi-provider TTS patterns
- **Batch generation** - Parallel video creation

### ❌ Not Needed
- **WebUI** - We're using Remotion templates
- **Docker deployment** - Different stack

## How It Helps Us

1. **Reference for script generation** - Copy their prompts, adapt for our niche
2. **Stock footage patterns** - Pexels API integration patterns
3. **Subtitle styling** - Font/color/position logic (may map to Remotion)
4. **Clip duration tuning** - How long each clip should be

## Key Files to Study

```
app/
├── services/
│   ├── llm.py         # LLM provider abstraction
│   ├── material.py    # Pexels fetching
│   ├── voice.py       # TTS synthesis
│   └── video.py       # moviepy composition
├── config/
│   └── config.py      # All configurable params
└── utils/
    └── subtitle.py    # Subtitle generation
```

## Gaps / Limitations

- Python-only (we're TypeScript)
- Uses moviepy (we're using Remotion)
- No face-cam or PiP support
- No trend detection / research phase

---

## Verdict

**Value: HIGH** - Excellent reference for script generation, stock footage integration, and subtitle styling. The prompts and architecture patterns are directly applicable even though we use different tech.
