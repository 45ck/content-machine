# Research Report: MoneyPrinter

**Repo:** `FujiwaraChoki/MoneyPrinter`  
**Location:** `vendor/MoneyPrinter/`  
**Stars:** 11k+  
**Language:** Python

---

## What It Does

Simpler YouTube Shorts automation tool. Provide a **topic**, it generates a short-form video.

Key difference from MoneyPrinterTurbo: Uses **TikTok's TTS** instead of Azure/OpenAI.

## Key Features

| Feature               | Details                  |
| --------------------- | ------------------------ |
| **TTS**               | TikTok session-based TTS |
| **Video Composition** | moviepy + ImageMagick    |
| **Platform Focus**    | YouTube Shorts           |

## Tech Stack

- **Backend:** Python
- **Video:** moviepy, ImageMagick
- **TTS:** TikTok API (requires session ID)
- **Stock Footage:** Similar Pexels approach

## What We Can Reuse

### ✅ High Value

- **TikTok TTS integration** - Free TTS option (session-based)
- **ImageMagick subtitle patterns** - Text overlay techniques

### ⚠️ Medium Value

- **Simpler architecture** - Good for understanding basics

### ❌ Not Needed

- **Full pipeline** - MoneyPrinterTurbo is more complete

## How It Helps Us

1. **TikTok TTS fallback** - Free TTS option if we need it
2. **Simpler reference** - Easier to understand basic video generation

## Key Files to Study

```
Backend/
├── video.py          # Main video generation
├── tts.py            # TikTok TTS
└── gpt.py            # Script generation
```

## Gaps / Limitations

- Less feature-complete than MoneyPrinterTurbo
- TikTok session ID requirement (fragile auth)
- No batch generation
- No API mode

---

## Verdict

**Value: LOW-MEDIUM** - Simpler reference but MoneyPrinterTurbo is more comprehensive. TikTok TTS is interesting but session-based auth is unreliable. Keep as fallback reference.
