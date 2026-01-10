# Content Machine

Automated short-form video generation pipeline for TikTok, Reels, and Shorts.

> **Status:** Early development. Not production-ready yet.

## What is this?

Content Machine is a CLI-first pipeline that transforms a topic into a short-form video in four stages:

```
topic -> script.json -> audio.wav + timestamps.json -> visuals.json -> video.mp4
```

Run the full pipeline with `cm generate` or run each stage independently.

**Key features:**

- LLM script generation into scene-based `script.json`
- Local TTS via kokoro-js with word-level timestamps from whisper.cpp
- Visual matching to scenes with stock footage providers (Pexels/Pixabay)
- Remotion rendering with word-highlighted captions
- CLI-first, stage-by-stage artifacts for iteration and CI
- Custom asset imports and workflow definitions for marketing pipelines

## Pipeline

| Stage   | Command      | Input                                            | Output                         |
| ------- | ------------ | ------------------------------------------------ | ------------------------------ |
| script  | `cm script`  | topic string                                     | `script.json`                  |
| audio   | `cm audio`   | `script.json`                                    | `audio.wav`, `timestamps.json` |
| visuals | `cm visuals` | `timestamps.json`                                | `visuals.json`                 |
| render  | `cm render`  | `visuals.json` + `audio.wav` + `timestamps.json` | `video.mp4`                    |

`cm generate` runs the full pipeline in order.

## Quick Start

```bash
# Clone
git clone https://github.com/45ck/content-machine.git
cd content-machine

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY

# Run the full pipeline in dev mode
npm run cm -- generate "Redis vs PostgreSQL for caching" --archetype versus --output output/video.mp4 --keep-artifacts
```

## Recommended Video Pipeline (Default)

For best audio/caption sync, the default pipeline runs audio-first with Whisper timestamps
and reconciles ASR output back to the script text.

```bash
# One-time Whisper setup (needed for audio-first)
node --input-type=module -e "import('@remotion/install-whisper-cpp').then(async (w)=>{ await w.downloadWhisperModel({ model: 'base', folder: './.cache/whisper' }); await w.installWhisperCpp({ to: './.cache/whisper', version: '1.5.5' }); console.log('whisper ready'); })"

# Generate a short video with best-sync defaults
cm generate "Redis vs PostgreSQL for caching" --archetype versus --output output/video.mp4 --keep-artifacts
```

## Custom Assets and Workflows

Bring your own audio + clips and still use cm captions/rendering:

```bash
# 1) Generate timestamps from existing audio
cm timestamps --audio assets/voiceover.wav --output output/timestamps.json

# 2) Build visuals.json from local footage
cm import visuals --timestamps output/timestamps.json --clips assets/clips --output output/visuals.json

# 3) Render with your assets
cm generate "Launch teaser" \
  --audio assets/voiceover.wav \
  --timestamps output/timestamps.json \
  --visuals output/visuals.json \
  --output output/video.mp4
```

For repeatable pipelines, define a workflow in `./.cm/workflows/<id>/workflow.json`:

```bash
cm workflows list
cm generate "Product recap" --workflow acme-custom --workflow-allow-exec --output output/video.mp4
```

## Split-Screen Gameplay + Pexels (Brainrot Template)

This produces the same style as `output/demo-subway-pexels/video.mp4`: gameplay on one half,
Pexels B-roll on the other, CapCut-style captions, muted gameplay audio.

Prereqs:

- `.env` has `OPENAI_API_KEY` (keyword extraction) and `PEXELS_API_KEY` (stock footage).
- Gameplay clips live in `~/.cm/assets/gameplay/<style>/` (or pass `--gameplay <path>`).

```bash
# 1) Prepare gameplay clips
mkdir -p ~/.cm/assets/gameplay/subway-surfers
cp /path/to/subway.mp4 ~/.cm/assets/gameplay/subway-surfers/

# 2) Generate script + audio + timestamps
cm script --topic "Redis vs PostgreSQL for caching" -o output/script.json
cm audio --input output/script.json --output output/audio.wav --timestamps output/timestamps.json --tts-speed 1.2

# 3) Match Pexels visuals + gameplay
cm visuals --input output/timestamps.json --provider pexels --orientation portrait \
  --gameplay-style subway-surfers \
  --output output/demo-subway-pexels/visuals.json

# 4) Render split-screen (gameplay on top, Pexels on bottom)
cm render --template brainrot-split-gameplay-top --split-layout gameplay-top \
  --input output/demo-subway-pexels/visuals.json \
  --timestamps output/timestamps.json \
  --audio output/audio.wav \
  --output output/demo-subway-pexels/video.mp4 \
  --download-assets
```

Layout options:

- Swap positions: `--split-layout gameplay-bottom`
- Force full-screen: `--gameplay-position full` or `--content-position full`

Troubleshooting:

- If Remotion fails to decode a gameplay clip, transcode to H.264 baseline:
  `ffmpeg -y -i input.mp4 -vf "scale=1080:-2" -c:v libx264 -profile:v baseline -level 3.1 -pix_fmt yuv420p -preset veryfast -crf 23 -an -movflags +faststart output.mp4`
- For detailed logs: `--verbose` plus `REMOTION_LOG_LEVEL=verbose`

## Vendored Dependencies

This repo vendors several open-source projects for video generation:

```
vendor/
  remotion/              # React-based video composition
  short-video-maker/     # Reference patterns for Pexels + Kokoro
  open-deep-research/    # Deep research agent patterns
  ...
```

See [VENDORING.md](VENDORING.md) for details.

## Configuration

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
PEXELS_API_KEY=...         # For stock footage
REDDIT_CLIENT_ID=...       # For trend fetching
REDDIT_CLIENT_SECRET=...
```

## Caption Fonts

Default captions use an Inter-first stack with Montserrat fallback. A small Inter font pack
ships in `assets/fonts/Inter` for consistent rendering.

CLI overrides:

```bash
cm render --caption-font-family "Inter" \
  --caption-font-weight 700 \
  --caption-font-file "assets/fonts/Inter/Inter-Bold.woff2" \
  --input visuals.json --timestamps timestamps.json --audio audio.wav
```

Config defaults (`.content-machine.toml`):

```toml
[captions]
font_family = "Inter"
font_weight = 700
font_file = "assets/fonts/Inter/Inter-Bold.woff2"
```

JSON config supports multiple fonts:

```json
{
  "captions": {
    "fontFamily": "Inter",
    "fontWeight": 700,
    "fonts": [
      {
        "family": "Inter",
        "src": "assets/fonts/Inter/Inter-Bold.woff2",
        "weight": 700
      }
    ]
  }
}
```

## Export-First Design

Content Machine does **not** auto-publish to platforms. Instead, it generates a ZIP package:

```
output/
  2026-01-01-discord-bot-tutorial/
    video.mp4
    cover.jpg
    metadata.json
    upload-checklist.md    # Platform-specific instructions
    platform-hints/
      tiktok.md
      reels.md
      shorts.md
```

**Why?** TikTok/Instagram APIs require business verification and audit. Export-first means:

- Works immediately (no API approvals needed)
- Human reviews before publish
- Can customize per-platform before upload

## Project Structure

```
src/
  cli/        # Commander.js entry points
  script/     # Script generation pipeline
  audio/      # TTS + ASR pipeline
  visuals/    # Footage matching
  render/     # Remotion integration
  core/       # Shared infrastructure
  prompts/    # Prompt templates
  hooks/      # Hook selection helpers
  package/    # Packaging outputs
  publish/    # Publish/export helpers
  research/   # Research command logic
  score/      # Scoring pipeline
  validate/   # Validation pipeline
  types/      # Shared types
  test/       # Test stubs/support
  index.ts    # Package exports
```

## Roadmap

- [ ] Core CLI pipeline (script/audio/visuals/render)
- [ ] Remotion templates
- [ ] Playwright capture scenarios
- [ ] Review queue UI
- [ ] Analytics dashboard
- [ ] Trend MCP integration
- [ ] Multi-platform scheduling

## License

MIT - See [LICENSE](LICENSE)

## Credits

Built for [Vibecord](https://vibecord.dev) / [Vibeforge](https://vibeforge.dev).

Inspired by:

- [Remotion](https://remotion.dev) - React video framework
- [short-video-maker](https://github.com/gyuha/short-video-maker) - Reference patterns
- [open-deep-research](https://github.com/langchain-ai/open_deep_research) - Research agent patterns
