# Research Report: Remotion Template Audiogram

**Repo:** `remotion-dev/template-audiogram`  
**Location:** `templates/template-audiogram/`  
**License:** Remotion License (company license may be needed)  
**Language:** TypeScript/React

---

## What It Does

Remotion template for creating **"audiograms"** - video clips from podcasts or audio content for social media sharing.

1. Audio waveform visualization
2. Cover image display
3. Subtitles/captions overlay
4. Social-media-ready format

## Key Features

| Feature                 | Details                                    |
| ----------------------- | ------------------------------------------ |
| **Framework**           | Remotion (React video)                     |
| **Audio Visualization** | Waveform display                           |
| **Captions**            | SRT or JSON format, Whisper.cpp generation |
| **Long Audio**          | `useWindowedAudioData()` for performance   |
| **Dev Mode**            | `npx remotion studio`                      |
| **Render**              | `npx remotion render`                      |

## Tech Stack

- **Framework:** Remotion
- **Language:** TypeScript/React
- **Captioning:** Whisper.cpp via `@remotion/install-whisper-cpp`
- **Audio:** `@remotion/captions` format

## Caption Generation

Built-in transcription script:

```bash
bun transcribe.ts
# or: npx tsx transcribe.ts
```

Features:

- Audio file path input
- Speech start time (skip intros/jingles)
- Outputs `captions.json` in correct format

Alternative sources:

- OpenAI Whisper API via `@remotion/openai-whisper`
- Descript
- Otter.ai, Scriptme.io

## What We Can Reuse

### ✅ High Value

- **Transcription script** - `transcribe.ts` for caption generation
- **Caption format** - `@remotion/captions` JSON structure
- **Windowed audio** - Performance optimization for long audio

### ⚠️ Medium Value

- **Waveform visualization** - If we want audio visualizations
- **Template structure** - Alternative composition patterns

### ❌ Not Needed

- **Podcast focus** - We're doing short-form, not podcast clips
- **Cover image** - Different visual style

## How It Helps Us

1. **Caption generation reference** - Alternative to `sub.mjs` in template-tiktok
2. **Long audio handling** - `useWindowedAudioData()` pattern
3. **Caption format spec** - `@remotion/captions` structure

## Key Files to Study

```
transcribe.ts          # Whisper.cpp caption generation ⭐
src/
├── Root.tsx           # Entry point
├── Audiogram.tsx      # Main composition
└── Subtitles.tsx      # Caption rendering

public/
├── audio.wav          # Example audio
└── captions.json      # Example caption format ⭐
```

## Gaps / Limitations

- Designed for podcast clips, not TikTok-style content
- Static cover image (no video footage)
- Different visual style than we need

---

## Verdict

**Value: MEDIUM** - Secondary reference for caption generation and audio handling. The `transcribe.ts` script is a good alternative pattern. `useWindowedAudioData()` useful if we handle longer content. Primary template should be `template-tiktok`.
