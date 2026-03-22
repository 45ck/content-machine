# Installation

## Prerequisites

- **Node.js 20 or later** — check with `node --version`
  - Install via [nvm](https://github.com/nvm-sh/nvm) (recommended) or [nodejs.org](https://nodejs.org/)
- **API keys** — you'll need at least an OpenAI key and a stock footage key to generate real videos (see [API Keys](#api-keys) below)

## Install

```bash
npm install -g @45ck/content-machine

# Verify
cm --help
```

Or run without installing:

```bash
npx -y @45ck/content-machine --help
```

## Optional: Whisper (Better Captions)

For word-level timestamp accuracy and the best caption sync, install Whisper:

```bash
cm setup whisper --model base
```

This downloads a small (~150MB) speech recognition model. Without Whisper, Content Machine falls back to estimated timestamps that are less accurate.

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
cm doctor
```

This checks for Node.js version, API key presence, Whisper installation, and other dependencies.

## Next Steps

- [Quickstart](QUICKSTART.md) — generate your first video
- [Configuration](CONFIGURATION.md) — customize defaults
- [Examples](EXAMPLES.md) — real-world recipes
