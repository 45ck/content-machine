# Content Machine

[![CI](https://github.com/45ck/content-machine/actions/workflows/ci.yml/badge.svg)](https://github.com/45ck/content-machine/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%4045ck%2Fcontent-machine)](https://www.npmjs.com/package/@45ck/content-machine)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

CLI-first automated short-form video generator for TikTok, Reels, and Shorts.

> **Status:** Early development. Not production-ready yet.

![Content Machine pipeline](https://raw.githubusercontent.com/45ck/content-machine/master/assets/demo/pipeline-preview.svg)

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

More: https://github.com/45ck/content-machine/blob/master/docs/user/QUICKSTART.md

## Docs

Start here:

- User docs: https://github.com/45ck/content-machine/blob/master/docs/user/README.md
- Docs portal: https://github.com/45ck/content-machine/blob/master/docs/README.md
- Google Gemini provider: https://github.com/45ck/content-machine/blob/master/docs/user/providers/gemini.md

Canonical references (generated; do not edit):

- Repo facts: https://github.com/45ck/content-machine/blob/master/docs/reference/REPO-FACTS.md
- Environment variables: https://github.com/45ck/content-machine/blob/master/docs/reference/ENVIRONMENT-VARIABLES.md
- Glossary (ubiquitous language): https://github.com/45ck/content-machine/blob/master/docs/reference/GLOSSARY.md

Examples and demo gallery:

- Examples: https://github.com/45ck/content-machine/blob/master/docs/user/EXAMPLES.md
- Demo media: https://github.com/45ck/content-machine/tree/master/docs/demo

## How It Works

Content Machine is a 4-stage pipeline:

```
topic -> script.json -> audio.wav + timestamps.json -> visuals.json -> video.mp4
```

Run end-to-end:

```bash
cm generate "Redis vs PostgreSQL" --archetype versus --output output/video.mp4
```

Stage-by-stage usage and full command references live in:

- https://github.com/45ck/content-machine/blob/master/docs/user/CLI.md
- https://github.com/45ck/content-machine/tree/master/docs/reference

## Terminology (Ubiquitous Language)

These words mean specific things in this repo:

- **Script archetype**: script format used by `cm script` / `cm generate`
- **Render template**: render preset used by `cm render` / `cm generate`
- **Pipeline workflow**: orchestration preset used by `cm generate`

Canonical glossary (generated): https://github.com/45ck/content-machine/blob/master/docs/reference/GLOSSARY.md

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
