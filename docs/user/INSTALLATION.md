# Installation

## Requirements

- Node.js `>=20` (canonical: [`docs/reference/REPO-FACTS.md`](../reference/REPO-FACTS.md))
- Recommended: `ffmpeg` (used by motion strategies like `kenburns`; canonical: `MOTION_STRATEGIES` in `registry/repo-facts.yaml`)

## Install

```bash
npm install -g @45ck/content-machine
cm --help
```

Run without installing:

```bash
npx -y @45ck/content-machine --help
```

## Optional One-Time Setup

For word-level timestamps (best caption sync), install Whisper:

```bash
cm setup whisper --model base
```

## API Keys

Set environment variables via `.env` (project-local) or your shell.

- Canonical list (generated): [`docs/reference/ENVIRONMENT-VARIABLES.md`](../reference/ENVIRONMENT-VARIABLES.md)
- Canonical config file locations/precedence (generated): [`docs/reference/CONFIG-SURFACE.md`](../reference/CONFIG-SURFACE.md)
