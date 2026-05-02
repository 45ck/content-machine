# Installation

## Prerequisites

- **Node.js 20.6 or later** — check with `node --version`
  - Install via [nvm](https://github.com/nvm-sh/nvm) (recommended) or [nodejs.org](https://nodejs.org/)
- **API keys** — you'll need at least an OpenAI key and a stock footage key to generate real videos (see [API Keys](#api-keys) below)

## Install Into An Agent Project

Use this path when you want Claude Code, Codex CLI, Cursor, or another
repo-aware agent to use Content Machine from your own project.

```bash
npm install --save-dev @45ck/content-machine

npx cm-install --target .content-machine --write-instructions
```

Use `--instruction-file CLAUDE.md` for Claude Code projects that load
root `CLAUDE.md` instead of `AGENTS.md`.

This creates a materialized pack:

- `.content-machine/README.md` — how humans and agents should use the pack
- `.content-machine/AGENTS.md` — agent operating rules to read or copy
  into root project instructions
- `.content-machine/skills/` — all shipped `SKILL.md` files
- `.content-machine/flows/` — runnable flow manifests when
  `includeFlows` is true
- `AGENTS.md` — managed root instruction block when
  `--write-instructions` is used

The managed root block points your agent at `.content-machine/README.md`,
`.content-machine/AGENTS.md`, and `.content-machine/skills/` before
video work. Full copy-paste prompt:
[Agent Harness Install](AGENT-HARNESS-INSTALL.md).

CLI options:

| CLI Option              | Default                 | Use                                                                |
| ----------------------- | ----------------------- | ------------------------------------------------------------------ |
| `--target`              | `.content-machine`      | Where to materialize skills, flows, README, and agent instructions |
| `--package-name`        | `@45ck/content-machine` | Package or fork name used in generated runner commands             |
| `--no-flows`            | flows included          | Skip `.flow` manifests when you only want skill docs               |
| `--no-examples`         | examples included       | Remove skill `examples/request.json` files                         |
| `--write-instructions`  | off                     | Add or refresh a managed root harness instruction block            |
| `--instruction-file`    | `AGENTS.md`             | File for the managed instruction block, such as `CLAUDE.md`        |
| `--overwrite`/`--force` | off                     | Refresh an existing materialized pack intentionally                |
| `--json`                | off                     | Print machine-readable install output                              |

JSON-stdio fields:

| Field               | Default                 | Use                                  |
| ------------------- | ----------------------- | ------------------------------------ |
| `targetDir`         | `.content-machine`      | Equivalent to `--target`             |
| `packageName`       | `@45ck/content-machine` | Equivalent to `--package-name`       |
| `includeFlows`      | `true`                  | Set to `false` with `--no-flows`     |
| `includeExamples`   | `true`                  | Set to `false` with `--no-examples`  |
| `overwrite`         | `false`                 | Equivalent to `--overwrite`          |
| `writeInstructions` | `false`                 | Equivalent to `--write-instructions` |
| `instructionFile`   | `AGENTS.md`             | Equivalent to `--instruction-file`   |

The JSON-stdio form remains available for agents that prefer structured
stdin:

```bash
cat <<'JSON' | npx --no-install cm-agent install-skill-pack
{
  "targetDir": ".content-machine",
  "includeFlows": true,
  "includeExamples": true,
  "overwrite": false,
  "writeInstructions": true,
  "instructionFile": "AGENTS.md"
}
JSON
```

## Install From A Repo Checkout

Use this path when contributing to Content Machine itself or running the
source checkout directly.

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine
npm install
```

Verify the primary surfaces:

```bash
cat <<'JSON' | node --import tsx scripts/harness/skill-catalog.ts
{}
JSON
```

Or use the npm alias:

```bash
printf '{}\n' | npm run agent:skill-catalog
```

If you only need the thin compatibility shell, you can also run:

```bash
npx -p @45ck/content-machine cm doctor
```

## Optional: Check Whisper Status (Better Captions)

For word-level timestamp accuracy and the best caption sync, check
whether Whisper support is available:

```bash
npm run cm -- doctor
```

This command diagnoses the environment; it does not install Whisper by
itself. Whisper remains optional. The old `cm setup whisper` workflow is
part of the archived CLI control plane.

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

Installed project:

```bash
cat <<'JSON' | npx --no-install cm-agent doctor-report
{
  "strict": false
}
JSON
```

Repo checkout:

```bash
printf '{"strict":false}\n' | npm run agent:doctor-report
```

The thin compatibility shell can also diagnose the checkout:

```bash
npm run cm -- doctor
```

These checks cover Node.js version, API key presence, Whisper
installation, and other dependencies.

## Next Steps

- [Agent Quickstart](AGENT-QUICKSTART.md) — primary path
- [Configuration](CONFIGURATION.md) — customize defaults
- [Examples](EXAMPLES.md) — real-world workflows
