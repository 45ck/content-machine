# Content Machine

[![CI](https://github.com/45ck/content-machine/actions/workflows/ci.yml/badge.svg)](https://github.com/45ck/content-machine/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%4045ck%2Fcontent-machine)](https://www.npmjs.com/package/@45ck/content-machine)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner.dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="assets/banner.light.png" />
    <img src="assets/banner.light.png" alt="content-machine banner" width="100%" />
  </picture>
</p>

**Turn any topic into a TikTok/Reels/Shorts video from the command line.**

One command in, vertical video out. Content Machine generates scripts, voiceover, captions, and stock footage — then renders everything into a ready-to-upload MP4.

```bash
cm generate "Redis vs PostgreSQL for caching" --archetype versus -o video.mp4
```

<p align="center">
  <img src="assets/demo/demo-1-split-screen.gif" alt="Split screen demo" width="32%" />
  <img src="assets/demo/demo-2-subway-captions.gif" alt="Caption styles demo" width="32%" />
  <img src="assets/demo/demo-4-latest-news.gif" alt="Latest news demo" width="32%" />
</p>

> Early development — working, but APIs may change between releases.

## Install

```bash
npm install -g @45ck/content-machine
```

Or run without installing:

```bash
npx -y @45ck/content-machine --help
```

Requires Node.js >= 20. See [full installation guide](docs/user/INSTALLATION.md) for optional setup (Whisper, ffmpeg).

## Quick Start

**1. Try the demo** (no API keys needed):

```bash
cm demo -o output/demo.mp4
```

**2. Generate a real video** (needs OpenAI + Pexels keys):

```bash
export OPENAI_API_KEY="sk-..."
export PEXELS_API_KEY="..."

cm generate "5 things every dev should know about Docker" \
  --archetype listicle \
  -o output/docker-tips.mp4
```

**3. Diagnose issues:**

```bash
cm doctor
```

See the full [Quickstart guide](docs/user/QUICKSTART.md) for Whisper setup and advanced options.

## What You Can Make

| Archetype    | What it produces            | Example                                                |
| ------------ | --------------------------- | ------------------------------------------------------ |
| **listicle** | "5 things..." numbered tips | `cm generate "5 Docker tips" --archetype listicle`     |
| **versus**   | Side-by-side comparison     | `cm generate "Redis vs Postgres" --archetype versus`   |
| **howto**    | Step-by-step tutorial       | `cm generate "Deploy to AWS" --archetype howto`        |
| **myth**     | Myth vs reality debunk      | `cm generate "JavaScript myths" --archetype myth`      |
| **story**    | Narrative with a hook       | `cm generate "How Stripe was built" --archetype story` |
| **hot-take** | Provocative opinion piece   | `cm generate "REST is dead" --archetype hot-take`      |

More examples: [docs/user/EXAMPLES.md](docs/user/EXAMPLES.md)

[![Gemini image-led short preview](assets/demo/demo-5-gemini-2026-feels-like-2016.gif)](docs/user/examples/gemini-image-shorts.md)

## How It Works

Content Machine runs a 4-stage pipeline — each stage can also run independently:

```
topic → script → audio + timestamps → visuals → video.mp4
```

```bash
# Or run stages individually
cm script  --topic "Redis vs PostgreSQL"       # LLM generates script
cm audio   --input script.json                 # TTS + word-level timestamps
cm visuals --input timestamps.json             # Stock footage matching
cm render  --input visuals.json                # Remotion renders MP4
```

![Pipeline overview](assets/demo/pipeline-preview.svg)

## Documentation

- **[User Guide](docs/user/README.md)** — installation, configuration, CLI reference, examples
- **[Developer Docs](docs/dev/README.md)** — architecture, contributing guides, specs
- **[Reference](docs/reference/)** — generated CLI references, environment variables, glossary

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine && npm install && cp .env.example .env
npm run cm -- --help
```

## License

MIT
