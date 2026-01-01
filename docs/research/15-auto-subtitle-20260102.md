# Research Report: Auto-Subtitle

**Repo:** `m1guelpf/auto-subtitle`  
**Location:** `vendor/auto-subtitle/`  
**Stars:** 1k+  
**Language:** Python  
**License:** MIT

---

## What It Does

Simple CLI tool to **automatically generate and overlay subtitles** on any video using FFmpeg + OpenAI Whisper.

Install with pip, run with one command.

## Key Features

| Feature | Details |
|---------|---------|
| **Simplicity** | `auto_subtitle video.mp4 -o output/` |
| **Models** | tiny, base, small, medium, large |
| **Translation** | `--task translate` for non-English → English |
| **Output** | Creates `subtitled/` folder with result |

## Tech Stack

- **Language:** Python
- **Transcription:** OpenAI Whisper
- **Video:** FFmpeg
- **Installation:** pip

## Usage

```bash
# Basic usage
auto_subtitle /path/to/video.mp4 -o subtitled/

# Better accuracy (larger model)
auto_subtitle /path/to/video.mp4 --model medium

# Translate to English
auto_subtitle /path/to/video.mp4 --task translate
```

## What We Can Reuse

### ✅ High Value
- **Translation workflow** - Non-English → English captions
- **Model selection** - Size/accuracy tradeoffs

### ⚠️ Medium Value
- **CLI patterns** - Simple UX reference

### ❌ Not Needed
- **Full implementation** - We use Remotion + Whisper.cpp

## How It Helps Us

1. **Translation feature** - Could add subtitle translation
2. **Whisper model guidance** - Which model for which use case
3. **Simple CLI** - UX reference

## Gaps / Limitations

- No word highlighting
- No styling options
- Basic subtitle overlay only
- No caption customization

---

## Verdict

**Value: LOW** - Very simple tool. The translation workflow is interesting but we have more comprehensive caption tools (template-tiktok, captacity). Good reference for minimal Whisper integration.
