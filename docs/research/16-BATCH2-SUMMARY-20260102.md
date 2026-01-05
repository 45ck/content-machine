# Research Summary: New Vendored Repos (Batch 2)

**Date:** January 2026  
**Purpose:** Extended research on 32 additional short-video repos

---

## 🔴 CRITICAL - Use These First

| Repo                        | Location                          | Why Critical                                     |
| --------------------------- | --------------------------------- | ------------------------------------------------ |
| **short-video-maker-gyori** | `vendor/short-video-maker-gyori/` | TypeScript + Remotion + MCP + REST - SAME STACK! |
| **vidosy**                  | `templates/vidosy/`               | Config-driven Remotion, JSON → video             |

---

## 🟠 HIGH Value

| Repo               | Location                 | Best For                              |
| ------------------ | ------------------------ | ------------------------------------- |
| **ShortGPT**       | `vendor/ShortGPT/`       | EdgeTTS (free 30+ languages), dubbing |
| **viralfactory**   | `vendor/viralfactory/`   | Auto-upload TikTok/YouTube, Coqui TTS |
| **MoneyPrinterV2** | `vendor/MoneyPrinterV2/` | Updated MoneyPrinter patterns         |

---

## 🟡 MEDIUM Value

| Repo                      | Location                        | Best For                              |
| ------------------------- | ------------------------------- | ------------------------------------- |
| **captacity**             | `vendor/captacity/`             | Word highlighting, caption styling    |
| **shortrocity**           | `vendor/shortrocity/`           | DALL-E backgrounds, simple pipeline   |
| **Clip-Anything**         | `vendor/Clip-Anything/`         | Virality scoring, multimodal analysis |
| **auto-subtitle**         | `vendor/auto-subtitle/`         | Translation workflow                  |
| **RedditShortVideoMaker** | `vendor/RedditShortVideoMaker/` | Reddit → video pipeline               |
| **AI-short-creator**      | `vendor/AI-short-creator/`      | Long → shorts patterns                |
| **reels-clips-automator** | `vendor/reels-clips-automator/` | Reels-specific patterns               |

---

## 🟢 LOW Value (Reference Only)

| Repo                                   | Location                                     | Notes                        |
| -------------------------------------- | -------------------------------------------- | ---------------------------- |
| **short-video-maker-leke**             | `vendor/short-video-maker-leke/`             | Fork/variant                 |
| **YASGU**                              | `vendor/YASGU/`                              | Yet Another Shorts Generator |
| **AI-Content-Studio**                  | `vendor/AI-Content-Studio/`                  | General content              |
| **TikTokAIVideoGenerator**             | `vendor/TikTokAIVideoGenerator/`             | Basic TikTok gen             |
| **youtube-auto-shorts-generator**      | `vendor/youtube-auto-shorts-generator/`      | Basic pipeline               |
| **videoGenerator**                     | `vendor/videoGenerator/`                     | Simple generator             |
| **Cassette**                           | `vendor/Cassette/`                           | Music video focus            |
| **Crank**                              | `vendor/Crank/`                              | Basic generator              |
| **Auto-YouTube-Shorts-Maker**          | `vendor/Auto-YouTube-Shorts-Maker/`          | Basic pipeline               |
| **silent_autopost**                    | `vendor/silent_autopost/`                    | Auto-posting focus           |
| **AutoShortsAI**                       | `vendor/AutoShortsAI/`                       | SaaS-like                    |
| **Faceless-short**                     | `vendor/Faceless-short/`                     | Faceless video               |
| **short-video-creator**                | `vendor/short-video-creator/`                | Basic generator              |
| **ai-clips-maker**                     | `vendor/ai-clips-maker/`                     | Clipping tool                |
| **ShortReelX**                         | `vendor/ShortReelX/`                         | Reel-focused                 |
| **shorts_maker**                       | `vendor/shorts_maker/`                       | Basic maker                  |
| **AI-Youtube-Shorts-Generator-fork**   | `vendor/AI-Youtube-Shorts-Generator-fork/`   | Fork                         |
| **auto-subtitle-generator**            | `vendor/auto-subtitle-generator/`            | Basic subtitles              |
| **video-subtitles-generator**          | `vendor/video-subtitles-generator/`          | Basic subtitles              |
| **tiktok-automatic-videos**            | `vendor/tiktok-automatic-videos/`            | TikTok automation            |
| **YouTube-shorts-generator**           | `vendor/YouTube-shorts-generator/`           | Basic generator              |
| **youtube-shorts-reddit-scraper**      | `vendor/youtube-shorts-reddit-scraper/`      | Reddit scraping              |
| **OBrainRot**                          | `vendor/OBrainRot/`                          | Brain rot content            |
| **TikTok-Compilation-Video-Generator** | `vendor/TikTok-Compilation-Video-Generator/` | Compilations                 |
| **Short-Video-Creator**                | `templates/Short-Video-Creator/`             | Template reference           |

---

## Key Discoveries

### 1. TypeScript + Remotion Stack Exists!

**short-video-maker-gyori** and **vidosy** prove our target stack works:

- TypeScript
- Remotion for video
- MCP server for agents
- REST API for flexibility
- JSON configuration

### 2. Free TTS Options

| Tool          | Source                  | Languages           |
| ------------- | ----------------------- | ------------------- |
| **EdgeTTS**   | ShortGPT                | 30+ languages, free |
| **Kokoro**    | short-video-maker-gyori | English only, local |
| **Coqui TTS** | viralfactory            | Open source, many   |

### 3. Auto-Upload to Platforms

**viralfactory** has TikTok + YouTube upload - valuable for distribution automation.

### 4. Virality/Quality Scoring

**Clip-Anything** shows patterns for scoring content engagement potential.

---

## Updated Architecture Recommendation

```
┌─────────────────────────────────────────────────────────────────┐
│                     Content Machine CLI                          │
│                     (based on short-video-maker-gyori)          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MCP + REST Server                              │
│            (from short-video-maker-gyori patterns)              │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   Research    │      │    Script     │      │    Render     │
│ (mcp-reddit)  │      │   (OpenAI)    │      │  (Remotion)   │
└───────────────┘      └───────────────┘      └───────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│     TTS       │      │   Captions    │      │   Assets      │
│ (EdgeTTS/     │      │ (Whisper.cpp) │      │   (Pexels)    │
│  Kokoro)      │      │               │      │               │
└───────────────┘      └───────────────┘      └───────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Config-Driven Remotion Composition                  │
│                    (vidosy JSON patterns)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Research Reports

### Critical

- [10-short-video-maker-gyori.md](10-short-video-maker-gyori.md) - TypeScript + Remotion + MCP
- [12-vidosy.md](12-vidosy.md) - Config-driven Remotion

### High Value

- [08-shortgpt.md](08-shortgpt.md) - EdgeTTS, dubbing
- [11-viralfactory.md](11-viralfactory.md) - Auto-upload, Coqui TTS

### Medium Value

- [09-captacity.md](09-captacity.md) - Caption styling
- [13-shortrocity.md](13-shortrocity.md) - DALL-E backgrounds
- [14-clip-anything.md](14-clip-anything.md) - Virality scoring
- [15-auto-subtitle.md](15-auto-subtitle.md) - Translation

---

## Implementation Priority

1. **Study short-video-maker-gyori deeply** - It's our blueprint
2. **Adopt vidosy's JSON config pattern** - Video as data
3. **Use EdgeTTS from ShortGPT** - Free multi-language TTS
4. **Keep Remotion templates** - template-tiktok for captions
5. **Later: Add viralfactory's upload** - Platform distribution
