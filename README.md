# Content Machine 🎬

Automated short-form video generation pipeline for TikTok, Reels, and Shorts.

> **Status:** Early development. Not production-ready yet.

## What is this?

Content Machine is a hybrid pipeline that combines deterministic automation with AI agents to generate short-form video content:

```
Daily Pipeline:  1A → 1B → 2 → 3 → 4 → 5 → 6 → 7
                 ↓    ↓    ↓   ↓   ↓   ↓   ↓   ↓
              Ingest Plan Script Asset Render Review Export Analytics
              (auto) (AI) (AI) (auto) (auto) (human) (auto) (AI)
```

**Key features:**
- 🤖 AI-powered content planning and script generation (GPT-4o)
- 🎥 Automated video rendering with Remotion
- 📸 Product UI capture with Playwright
- 🎙️ Text-to-speech with Kokoro
- 📝 Auto-generated captions with Whisper
- 👤 Human review gate before export
- 📊 Post-publish analytics and learning

## Architecture

| Step | Type | What it does |
|------|------|--------------|
| 1A - Trend Ingest | ⚙️ Deterministic | Fetch Reddit/trends, deduplicate |
| 1B - Planner | 🤖 Agent | GPT-4o selects topic + hook + CTA |
| 2 - Script | 🤖 Agent | GPT-4o writes scene-by-scene script |
| 3 - Assets | ⚙️ Deterministic | TTS, Playwright capture, Pexels B-roll |
| 4 - Render | ⚙️ Deterministic | Remotion composition + captions |
| 5 - Review | 👤 Human | Approve/reject/edit before export |
| 6 - Export | ⚙️ Deterministic | ZIP package with upload checklist |
| 7 - Analytics | 🤖 Agent | Analyze performance, suggest improvements |

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

# Run daily pipeline (interactive)
npm run cli daily

# Run weekly research
npm run cli weekly
```

## Vendored Dependencies

This repo vendors several open-source projects for video generation:

```
vendor/
├── remotion/              # React-based video composition
├── short-video-maker/     # Reference patterns for Pexels + Kokoro
├── open-deep-research/    # Deep research agent patterns
└── ...
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

## Export-First Design

Content Machine does **not** auto-publish to platforms. Instead, it generates a ZIP package:

```
output/
└── 2026-01-01-discord-bot-tutorial/
    ├── video.mp4
    ├── cover.jpg
    ├── metadata.json
    ├── upload-checklist.md    # Platform-specific instructions
    └── platform-hints/
        ├── tiktok.md
        ├── reels.md
        └── shorts.md
```

**Why?** TikTok/Instagram APIs require business verification and audit. Export-first means:
- Works immediately (no API approvals needed)
- Human reviews before publish
- Can customize per-platform before upload

## Project Structure

```
src/
├── cli.ts                 # Command-line interface
├── index.ts               # Main exports
├── types/                 # Zod schemas
├── pipeline/              # Orchestrator + state machine
├── steps/                 # Individual pipeline steps
│   ├── 1a-trend-ingest.ts
│   ├── 1b-planner.ts
│   ├── 2-script-generation.ts
│   ├── 3-asset-capture.ts
│   ├── 4-video-render.ts
│   ├── 5-human-review.ts
│   ├── 6-export-package.ts
│   └── 7-analytics.ts
├── jobs/                  # Scheduled jobs
│   └── weekly-research.ts
└── remotion/              # Video templates
```

## Roadmap

- [ ] Core pipeline (Steps 1-7)
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
