# Content Machine

[![CI](https://github.com/45ck/content-machine/actions/workflows/ci.yml/badge.svg)](https://github.com/45ck/content-machine/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%4045ck%2Fcontent-machine)](https://www.npmjs.com/package/@45ck/content-machine)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

CLI-first automated short-form video generator for TikTok, Reels, and Shorts.

> **Status:** Early development. Not production-ready yet.

![Content Machine pipeline](assets/demo/pipeline-preview.svg)

## Install

```bash
# Node.js >= 20 required
npm install -g @45ck/content-machine

# Verify
cm --help

# Or run without installing
npx -y @45ck/content-machine --help
```

## Quickstart

Verify install (no API keys required):

```bash
cm demo -o output/demo.mp4
```

Generate a real video (requires API keys):

```bash
export OPENAI_API_KEY="..."
export PEXELS_API_KEY="..."

cm generate "Redis vs PostgreSQL for caching" \
  --archetype versus \
  --pipeline standard \
  --output output/video.mp4 \
  --keep-artifacts
```

More: [`docs/user/QUICKSTART.md`](docs/user/QUICKSTART.md)

## Docs

Start here:

- User docs: [`docs/user/README.md`](docs/user/README.md)
- Docs portal: [`docs/README.md`](docs/README.md)

Canonical references (generated; do not edit):

- Repo facts: [`docs/reference/REPO-FACTS.md`](docs/reference/REPO-FACTS.md)
- Environment variables: [`docs/reference/ENVIRONMENT-VARIABLES.md`](docs/reference/ENVIRONMENT-VARIABLES.md)
- Glossary (ubiquitous language): [`docs/reference/GLOSSARY.md`](docs/reference/GLOSSARY.md)

Online docs (useful for npm installs): https://github.com/45ck/content-machine/tree/master/docs/user

## Demo Videos

GitHub READMEs can't reliably inline-play `mp4`, so this repo uses small previews (GIF/SVG)
and hosts full clips in GitHub Releases.

- Releases: https://github.com/45ck/content-machine/releases
- Demo media guide: [`docs/dev/guides/guide-demo-media-20260111.md`](docs/dev/guides/guide-demo-media-20260111.md)

### Demo 1: Split-screen gameplay + content (render template)

![Split-screen gameplay + content demo](assets/demo/demo-1-split-screen.gif)

How to reproduce: [`docs/user/examples/split-screen-gameplay.md`](docs/user/examples/split-screen-gameplay.md)

### Demo 2: Gameplay with TikTok captions (render template)

![Gameplay captions demo](assets/demo/demo-2-subway-captions.gif)

### Demo 3: Bring your own clips (no stock visuals)

![Import clips demo](assets/demo/demo-3-import-clips.gif)

### Demo 4: Latest news listicle (research -> video)

![Latest news listicle demo](assets/demo/demo-4-latest-news.gif)

Full clip: [`docs/demo/demo-4-latest-news.mp4`](docs/demo/demo-4-latest-news.mp4)

How to reproduce: [`docs/user/examples/latest-news-listicle.md`](docs/user/examples/latest-news-listicle.md)

## How It Works

Content Machine is a 4-stage pipeline:

```
topic -> script.json -> audio.wav + timestamps.json -> visuals.json -> video.mp4
```

Run end-to-end:

```bash
cm generate "Redis vs PostgreSQL" --archetype versus --output output/video.mp4
```

Or run stages independently:

```bash
cm script --topic "Redis vs PostgreSQL" -o output/script.json
cm audio --input output/script.json --output output/audio.wav --timestamps output/timestamps.json
cm visuals --input output/timestamps.json --output output/visuals.json
cm render --input output/visuals.json --audio output/audio.wav --timestamps output/timestamps.json -o output/video.mp4
```

## Terminology (Ubiquitous Language)

These words mean specific things in this repo:

- **Script archetype**: script format used by `cm script` / `cm generate`
- **Render template**: render preset used by `cm render` / `cm generate`
- **Pipeline workflow**: orchestration preset used by `cm generate`

Canonical glossary (generated): [`docs/reference/GLOSSARY.md`](docs/reference/GLOSSARY.md)

## Development (From Source)

Cloning the repo is only needed for development:

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine

nvm install
nvm use

npm install
cp .env.example .env

npm run cm -- --help
```

## License

MIT.
