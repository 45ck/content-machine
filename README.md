# Content Machine

[![CI](https://github.com/45ck/content-machine/actions/workflows/ci.yml/badge.svg)](https://github.com/45ck/content-machine/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

Automated short-form video generation pipeline for TikTok, Reels, and Shorts.

> **Status:** Early development. Not production-ready yet.

![Content Machine pipeline](assets/demo/pipeline-preview.svg)

## Demo videos

GitHub READMEs can’t reliably inline-play `mp4`, so this repo uses small previews (GIF/SVG)
and links to full videos hosted elsewhere (GitHub Releases / YouTube / Vimeo).

- Demo hosting: https://github.com/45ck/content-machine/releases
- Guide: [docs/guides/guide-demo-media-20260111.md](docs/guides/guide-demo-media-20260111.md)

### Demo 1: Split-screen gameplay + content (brainrot template)

![Split-screen gameplay + content demo](assets/demo/demo-1-split-screen.gif)

Shows:

- Split-screen gameplay template with **Minecraft** (top) + **Subway Surfers** (bottom)
- `cm import visuals` to bring your own clips
- Gameplay slot selection (`--gameplay-style subway-surfers`)
- `cm render --template brainrot-split-gameplay-top`

### Demo 2: Subway Surfers-style gameplay with TikTok captions

![Gameplay captions demo](assets/demo/demo-2-subway-captions.gif)

Shows:

- Full-screen **Subway Surfers** gameplay with word-highlighted captions
- `cm import visuals` + `cm render --template tiktok-captions`

### Demo 3: Bring your own clips (no stock footage)

![Import clips demo](assets/demo/demo-3-import-clips.gif)

Shows:

- **Minecraft** clip imported via `cm import visuals`
- `cm render --template tiktok-captions --caption-preset karaoke`

Note: if you want _real_ gameplay (Subway Surfers / Minecraft parkour), you must supply your own
clips with the appropriate rights in `~/.cm/assets/gameplay/<style>/`. This repo does not ship or
download copyrighted gameplay footage by default. On Linux you can import clips with
`scripts/download-gameplay.sh` (local files or URLs you have rights to).

### Demo 4: Latest news listicle (TikTok captions + number badges)

![Latest news listicle demo](assets/demo/demo-4-latest-news.gif)

Full clip: `docs/demo/demo-4-latest-news.mp4`

This demo uses:

- TikTok-style chunk captions (smaller default sizing)
- Auto list-number badges (`#1`, `#2`, …) with fade/scale animation
- List markers hidden in captions (so you don’t see `1:` in the text)

Replicate the pipeline (exact commands):

```bash
# Node >= 20 recommended
nvm use

# (One-time) install deps + whisper for word-level timestamps
npm install
npm run cm -- setup whisper --model base

# 1) Research latest headlines (Jan 2026 example query)
npm run cm -- --yes research --no-angles \
  -q "Davos World Economic Forum Iraq US forces withdrawal North Korea official fired January 2026" \
  -s tavily -t week -l 12 \
  -o output/research.stories.json

# 2) Script (listicle)
npm run cm -- --yes script \
  --topic "global news this week" \
  --research output/research.stories.json \
  --duration 60 \
  -o output/script.stories.v2.json

# 3) Audio + timestamps (audio-first + reconcile for cleaner captions)
npm run cm -- --yes audio \
  -i output/script.stories.v2.json \
  -o output/audio.stories.v2.wav \
  --timestamps output/timestamps.stories.v2.json \
  --sync-strategy audio-first --reconcile --require-whisper --whisper-model base \
  --tts-speed 1.2 \
  --no-music --no-sfx --no-ambience

# 4) Visuals (Pexels)
npm run cm -- --yes visuals \
  -i output/timestamps.stories.v2.json \
  -o output/visuals.stories.v2.json \
  --provider pexels --orientation portrait

# 5) Render (TikTok preset + chunk mode)
npm run cm -- --yes render \
  -i output/visuals.stories.v2.json \
  --audio output/audio.stories.v2.wav \
  --timestamps output/timestamps.stories.v2.json \
  --caption-preset tiktok --caption-mode chunk \
  --caption-offset-ms -80 \
  --hook none \
  -o output/global-news.stories.v2.tiktok-smaller.badges-back.mp4
```

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

# Prereqs
# - Node.js >= 20 (recommended: use nvm + .nvmrc)
# - (optional) ffmpeg (for making README demo GIFs)

# Recommended Node setup (if you have nvm)
nvm install
nvm use

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY

# Note:
# - In this repo: use `npm run cm -- <command>`
# - If installed globally: use `cm <command>`

# Run the full pipeline in dev mode
npm run cm -- generate "Redis vs PostgreSQL for caching" --archetype versus --output output/video.mp4 --keep-artifacts
```

## Recommended Video Pipeline (Default)

For best audio/caption sync, the default pipeline runs audio-first with Whisper timestamps
and reconciles ASR output back to the script text.

```bash
# One-time Whisper setup (needed for audio-first)
npm run cm -- setup whisper --model base

# Generate a short video with best-sync defaults
npm run cm -- generate "Redis vs PostgreSQL for caching" --archetype versus --output output/video.mp4 --keep-artifacts
```

## Research (Latest News → Script → Video)

`cm research` gathers evidence across sources and writes `research.json`. You can then feed that
into `cm script` / `cm generate` to keep scripts grounded in the latest info.

```bash
# 1) Research (no API keys required: Hacker News + Reddit)
npm run cm -- research -q "latest AI model news" -s hackernews,reddit -t day -o research.json

# 2) Generate a full video using that evidence
npm run cm -- generate "latest AI model news" --research research.json -a story --duration 35 -o output/news.mp4
```

Auto-research shortcut (runs Stage 0 automatically):

```bash
# Use `--research` with no value (or `--research true`).
# Always uses hackernews,reddit; also adds web if BRAVE_SEARCH_API_KEY is set,
# and adds tavily if TAVILY_API_KEY is set.
npm run cm -- generate "latest AI model news" --research -a story --duration 35 -o output/news.mp4
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
GEMINI_API_KEY=...         # For AI image generation (provider: nanobanana)
GOOGLE_API_KEY=...         # Alias for GEMINI_API_KEY (either works)
BRAVE_SEARCH_API_KEY=...   # For cm research --sources web
TAVILY_API_KEY=...         # For cm research --sources tavily (and auto-research in cm generate)
REDDIT_CLIENT_ID=...       # Optional (some Reddit features may use auth)
REDDIT_CLIENT_SECRET=...   # Optional
```

### AI Images (Gemini)

Generate per-scene AI images (and animate them at render-time):

```bash
cm visuals --input timestamps.json --provider nanobanana --motion-strategy kenburns --output visuals.json
cm render --input visuals.json --audio audio.wav --timestamps timestamps.json --output video.mp4
```

### Config Files

- Project config (auto-discovered by walking up from `cwd`): `.content-machine.toml`, `content-machine.toml`, `.cmrc.json`
- User config (optional): `~/.cm/config.toml`, `~/.cm/config.json`, `~/.cmrc.json`
- Merge order: user first, then project (project wins)
- Override: `CM_CONFIG=/abs/path/to/config.toml` or `cm --config /abs/path/to/config.toml ...`
- Inspect: `cm config paths`, `cm config show`

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

## Contributing

PRs welcome. Please read:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [SUPPORT.md](SUPPORT.md)

## Credits

Built for [Vibecord](https://vibecord.dev) / [Vibeforge](https://vibeforge.dev).

Inspired by:

- [Remotion](https://remotion.dev) - React video framework
- [short-video-maker](https://github.com/gyuha/short-video-maker) - Reference patterns
- [open-deep-research](https://github.com/langchain-ai/open_deep_research) - Research agent patterns
