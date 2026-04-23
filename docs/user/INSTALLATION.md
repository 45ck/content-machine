# Installation

## Prerequisites

- **Node.js 20 or later** — check with `node --version`
  - Install via [nvm](https://github.com/nvm-sh/nvm) (recommended) or [nodejs.org](https://nodejs.org/)
- **API keys** — you'll need at least an OpenAI key and a stock footage key to generate real videos (see [API Keys](#api-keys) below)

## Install The Repo Surfaces

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine
npm install
```

Verify the primary surfaces:

```bash
cat <<'JSON' | npx tsx scripts/harness/skill-catalog.ts
{}
JSON
```

The published npm package also ships the repo-local `skills/`,
`flows/`, and `scripts/harness/` surfaces, but the canonical path is
working from the repo checkout.

If you only need the thin compatibility shell, you can also run:

```bash
npx -y @45ck/content-machine doctor
```

## Optional: Whisper (Better Captions)

For word-level timestamp accuracy and the best caption sync, install Whisper:

```bash
npm run cm -- doctor
```

Whisper remains optional. The old `cm setup whisper` workflow is part of
the archived CLI control plane.

## Optional: ffmpeg

Some features (Ken Burns motion effects, gameplay transcoding) use ffmpeg. Install it if you plan to use motion strategies:

- **macOS**: `brew install ffmpeg`
- **Ubuntu/Debian**: `sudo apt install ffmpeg`
- **Windows**: download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH

## API Keys

Set these as environment variables or in a `.env` file in your project directory.

### Required (for real videos)

| Key              | What it's for           | Get one at                                                  |
| ---------------- | ----------------------- | ----------------------------------------------------------- |
| `OPENAI_API_KEY` | Script generation (LLM) | [platform.openai.com](https://platform.openai.com/api-keys) |

### Recommended (at least one visual provider)

| Key              | What it's for                                 | Get one at                                                |
| ---------------- | --------------------------------------------- | --------------------------------------------------------- |
| `PEXELS_API_KEY` | Stock video footage                           | [pexels.com/api](https://www.pexels.com/api/) (free)      |
| `GOOGLE_API_KEY` | AI-generated images (Nanobanana) + Gemini LLM | [aistudio.google.com](https://aistudio.google.com/apikey) |

### Optional

| Key                    | What it's for                              |
| ---------------------- | ------------------------------------------ |
| `ANTHROPIC_API_KEY`    | Use Claude as the LLM instead of OpenAI    |
| `GEMINI_API_KEY`       | Alternative to `GOOGLE_API_KEY` for Gemini |
| `PIXABAY_API_KEY`      | Alternative stock footage provider         |
| `TAVILY_API_KEY`       | Web search for research-driven scripts     |
| `BRAVE_SEARCH_API_KEY` | Alternative web search provider            |
| `ELEVENLABS_API_KEY`   | Premium TTS voices                         |

### Example `.env` file

```bash
OPENAI_API_KEY=sk-...
PEXELS_API_KEY=...
```

Full list of environment variables: [`docs/reference/ENVIRONMENT-VARIABLES.md`](../reference/ENVIRONMENT-VARIABLES.md)

## Verify Your Setup

Run the built-in diagnostics:

```bash
npm run cm -- doctor
```

This checks for Node.js version, API key presence, Whisper installation, and other dependencies.

## Next Steps

- [Harness Quickstart](HARNESS-QUICKSTART.md) — primary path
- [Configuration](CONFIGURATION.md) — customize defaults
- [Examples](EXAMPLES.md) — real-world workflows
