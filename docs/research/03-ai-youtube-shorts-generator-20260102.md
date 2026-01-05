# Research Report: AI-Youtube-Shorts-Generator

**Repo:** `SamurAIGPT/AI-Youtube-Shorts-Generator`  
**Location:** `vendor/AI-Youtube-Shorts-Generator/`  
**Stars:** Growing  
**Language:** Python

---

## What It Does

AI-powered tool to **automatically extract highlights from long-form videos** and create YouTube Shorts. Unique because it:

1. Takes a **long video** (YouTube URL or local file)
2. Uses **Whisper** to transcribe
3. Uses **GPT-4o** to find the most engaging 2-minute segments
4. Auto-crops to 9:16 vertical format
5. Burns in stylized subtitles

## Key Features

| Feature                  | Details                                                       |
| ------------------------ | ------------------------------------------------------------- |
| **Input**                | YouTube URLs OR local video files                             |
| **Transcription**        | CUDA-accelerated Whisper                                      |
| **Highlight Selection**  | GPT-4o finds engaging segments                                |
| **Interactive Approval** | Review selections, 15s auto-approve timeout                   |
| **Smart Cropping**       | Face-centered (static) OR screen recordings (motion tracking) |
| **Subtitles**            | Franklin Gothic font, burned into video                       |
| **Output**               | 9:16 vertical format (TikTok/Shorts/Reels)                    |
| **Batch Processing**     | Process multiple URLs via `urls.txt`                          |

## Tech Stack

- **Backend:** Python
- **Transcription:** Whisper (GPU-accelerated)
- **LLM:** GPT-4o-mini for highlight detection
- **Video:** FFmpeg, ImageMagick
- **Subtitles:** ImageMagick text overlay

## What We Can Reuse

### ✅ High Value

- **Highlight detection prompts** - GPT-4o prompt for finding engaging segments
- **Smart cropping logic** - Face detection vs screen recording handling
- **Whisper integration patterns** - GPU-accelerated transcription
- **Batch processing** - Multiple video handling

### ⚠️ Medium Value

- **Interactive approval flow** - Human-in-the-loop pattern
- **Subtitle styling** - Franklin Gothic font burning

### ❌ Not Needed

- **YouTube download** - We're generating original content
- **Full pipeline** - Different use case (repurposing vs generating)

## How It Helps Us

1. **Whisper transcription patterns** - Reference for our TTS → captions flow
2. **GPT highlight detection** - Could adapt for "punch up" suggestions
3. **Smart cropping** - If we add face-cam support
4. **Batch processing patterns** - Multiple video generation

## Key Files to Study

```
main.py              # Entry point
download.py          # YouTube fetching (skip for us)
transcribe.py        # Whisper integration ⭐
highlight.py         # GPT-4o segment selection ⭐
crop.py              # Smart cropping logic ⭐
subtitle.py          # Caption burning
```

## Gaps / Limitations

- Designed for **repurposing** long content, not generating new content
- Linux-focused (apt-get dependencies)
- No audio generation (uses existing audio)

---

## Verdict

**Value: MEDIUM-HIGH** - Different use case (repurposing vs generating) but excellent reference for Whisper transcription, GPT-based content analysis, and smart cropping. The highlight detection prompts could be adapted for our "make script more engaging" feature.
