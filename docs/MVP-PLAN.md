# Content Machine MVP Plan

## Philosophy

**Semi-manual, CLI-first, learning-oriented.**

This is NOT an automated pipeline. It's a collection of CLI tools you run manually, inspect the output, tweak, and continue. The goal is to learn what works before automating.

```
You run a command → Review output → Tweak if needed → Run next command
```

## CLI Commands (MVP)

| Command                  | What it does                   | Output                        |
| ------------------------ | ------------------------------ | ----------------------------- |
| `cm research`            | Deep research on trends/topics | `research/YYYY-MM-DD.json`    |
| `cm plan <topic>`        | Generate content plan          | `plans/<slug>.json`           |
| `cm script <plan>`       | Write scene-by-scene script    | `scripts/<slug>.json`         |
| `cm tts <script>`        | Generate voiceover audio       | `assets/<slug>/voiceover.mp3` |
| `cm footage <script>`    | Download stock footage         | `assets/<slug>/*.mp4`         |
| `cm captions <audio>`    | Generate word-level captions   | `assets/<slug>/captions.json` |
| `cm render <assets-dir>` | Compose video with Remotion    | `output/<slug>/video.mp4`     |
| `cm export <video>`      | Package with checklist         | `output/<slug>.zip`           |

## Workflow Example

```bash
# 1. Research what's trending
cm research --subreddits discordapp,admincraft
# → Review research/2026-01-01.json, pick a topic

# 2. Plan content for chosen topic
cm plan "Discord bot in 60 seconds"
# → Review plans/discord-bot-in-60-seconds.json, edit if needed

# 3. Generate script
cm script plans/discord-bot-in-60-seconds.json
# → Review scripts/discord-bot-in-60-seconds.json, edit voiceover text

# 4. Generate TTS
cm tts scripts/discord-bot-in-60-seconds.json
# → Listen to assets/discord-bot-in-60-seconds/voiceover.mp3

# 5. Get stock footage
cm footage scripts/discord-bot-in-60-seconds.json
# → Check assets/discord-bot-in-60-seconds/*.mp4

# 6. Generate captions from audio
cm captions assets/discord-bot-in-60-seconds/voiceover.mp3
# → Review assets/discord-bot-in-60-seconds/captions.json

# 7. Render video
cm render assets/discord-bot-in-60-seconds/
# → Watch output/discord-bot-in-60-seconds/video.mp4

# 8. Package for upload
cm export output/discord-bot-in-60-seconds/video.mp4
# → Upload output/discord-bot-in-60-seconds.zip contents manually
```

## Directory Structure

```
content-machine/
├── src/
│   ├── cli.ts              # Commander CLI entry point
│   ├── commands/           # One file per command
│   │   ├── research.ts
│   │   ├── plan.ts
│   │   ├── script.ts
│   │   ├── tts.ts
│   │   ├── footage.ts
│   │   ├── captions.ts
│   │   ├── render.ts
│   │   └── export.ts
│   ├── lib/                # Shared utilities
│   │   ├── openai.ts       # GPT-4o wrapper
│   │   ├── pexels.ts       # Pexels API
│   │   ├── tts.ts          # TTS abstraction
│   │   └── whisper.ts      # Caption generation
│   └── types/              # Zod schemas
├── vendor/                 # Vendored repos for reference
│   ├── MoneyPrinterTurbo/  # Full pipeline reference
│   ├── remotion/           # Remotion templates
│   └── short-video-maker/  # Kokoro patterns
├── research/               # Research output
├── plans/                  # Content plans
├── scripts/                # Generated scripts
├── assets/                 # Assets per video
└── output/                 # Final videos
```

## Vendored Repos

| Repo                          | Why                                             |
| ----------------------------- | ----------------------------------------------- |
| `harry0703/MoneyPrinterTurbo` | Complete pipeline, Pexels/Pixabay, Azure TTS    |
| `remotion-dev/remotion`       | Video composition, template-tiktok for captions |
| `gyuha/short-video-maker`     | Kokoro TTS patterns, Pexels usage               |

## What We're NOT Building (MVP)

- ❌ Automatic orchestration
- ❌ Database / queue management
- ❌ Review queue UI
- ❌ Auto-publish to platforms
- ❌ Analytics collection
- ❌ Web interface

## What We ARE Building (MVP)

- ✅ CLI tools that do one thing each
- ✅ JSON files you can manually edit between steps
- ✅ Learn from vendored repos' implementations
- ✅ Remotion composition for final render
- ✅ Export package with upload checklist

## Implementation Order

1. **Vendor repos** (reference only, don't import)
2. **`cm research`** - simplest, just GPT call
3. **`cm plan`** - GPT with structured output
4. **`cm script`** - GPT with scene breakdown
5. **`cm tts`** - integrate Kokoro or use API
6. **`cm footage`** - Pexels API integration
7. **`cm captions`** - Whisper or faster-whisper
8. **`cm render`** - Remotion composition
9. **`cm export`** - ZIP packaging

## Cost Estimates (per video)

| Step      | Cost                              |
| --------- | --------------------------------- |
| Research  | ~$0.02 (GPT-4o)                   |
| Plan      | ~$0.01                            |
| Script    | ~$0.02                            |
| TTS       | $0 (Kokoro local) or ~$0.05 (API) |
| Footage   | $0 (Pexels free)                  |
| Captions  | $0 (local Whisper)                |
| Render    | $0 (local Remotion)               |
| **Total** | **~$0.05-0.10 per video**         |
