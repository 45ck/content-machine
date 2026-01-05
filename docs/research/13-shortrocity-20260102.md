# Research Report: Shortrocity

**Repo:** `unconv/shortrocity`  
**Location:** `vendor/shortrocity/`  
**Stars:** Growing  
**Language:** Python  
**License:** MIT

---

## What It Does

Makes AI-generated short videos with:

- ChatGPT script generation
- ElevenLabs or OpenAI TTS narration
- DALL-E 3 background images
- Captacity for word-highlighted captions

Built on top of the same author's **captacity** library.

## Key Features

| Feature      | Details                          |
| ------------ | -------------------------------- |
| **Script**   | ChatGPT generated                |
| **TTS**      | ElevenLabs or OpenAI             |
| **Images**   | DALL-E 3 generated backgrounds   |
| **Captions** | Captacity with word highlighting |
| **Styling**  | JSON settings file               |

## Tech Stack

- **Language:** Python
- **LLM:** OpenAI/ChatGPT
- **TTS:** ElevenLabs or OpenAI
- **Images:** DALL-E 3
- **Captions:** Captacity (Whisper + MoviePy)

## Configuration

```json
{
  "font": "Bangers-Regular.ttf",
  "font_size": 130,
  "font_color": "yellow",
  "stroke_width": 3,
  "stroke_color": "black",
  "highlight_current_word": true,
  "word_highlight_color": "red",
  "line_count": 2,
  "padding": 50,
  "shadow_strength": 1.0,
  "shadow_blur": 0.1
}
```

## What We Can Reuse

### ✅ High Value

- **DALL-E image generation** - AI-generated backgrounds
- **Caption styling config** - JSON-based settings
- **Word highlighting** - Karaoke-style captions

### ⚠️ Medium Value

- **Source content → video flow** - Simple pipeline

### ❌ Not Needed

- **Python implementation** - We use TypeScript/Remotion

## How It Helps Us

1. **DALL-E integration** - AI-generated backgrounds alternative to stock
2. **Caption styling patterns** - What works visually
3. **Simple pipeline** - Minimal moving parts reference

## Key Files to Study

```
main.py              # Full pipeline
settings.json        # Caption configuration ⭐
```

## Gaps / Limitations

- Python only
- No video footage (images only)
- No Pexels/stock video
- Depends on paid APIs (OpenAI, ElevenLabs)

---

## Verdict

**Value: MEDIUM** - Simple reference for DALL-E image backgrounds and caption styling. The captacity integration shows how to do word highlighting. Less relevant since we prefer video footage over AI images.
