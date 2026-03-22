# AGENTS.md

**content-machine** — CLI-first automated short-form video generator for TikTok, Reels, and Shorts.

> **Version:** 0.2.x | **License:** MIT | **Architecture:** 4-stage CLI pipeline (TypeScript + Remotion)

This file provides context for AI coding agents (Copilot, Claude Code, Cursor, etc.). For human docs, see [README.md](README.md) and [docs/](docs/).

---

## Pipeline Overview

```
cm generate "topic" --archetype <type> --output video.mp4
```

Four composable stages, each runnable independently:

| Stage   | Command      | Input           | Output                          | Technology                          |
| ------- | ------------ | --------------- | ------------------------------- | ----------------------------------- |
| Script  | `cm script`  | Topic string    | `script.json`                   | LLM (OpenAI/Anthropic/Gemini)       |
| Audio   | `cm audio`   | Script JSON     | `audio.wav` + `timestamps.json` | kokoro-js (TTS) + whisper.cpp (ASR) |
| Visuals | `cm visuals` | Timestamps JSON | `visuals.json`                  | Pexels API, Nanobanana (AI images)  |
| Render  | `cm render`  | All artifacts   | `video.mp4`                     | Remotion (React-based rendering)    |

---

## Key Concepts

- **Archetype**: script format — data files in `assets/archetypes/`, overrides in `.cm/archetypes/`
- **Template**: render preset — Remotion composition + render defaults
- **Workflow**: pipeline orchestration preset

Full glossary: [`docs/reference/GLOSSARY.md`](docs/reference/GLOSSARY.md)

---

## Repository Structure

```
src/
├── cli/          # Commander.js CLI entry points and commands
├── script/       # Stage 1: LLM script generation
├── audio/        # Stage 2: TTS + ASR pipeline
├── visuals/      # Stage 3: Visual asset matching
├── render/       # Stage 4: Remotion video rendering
├── core/         # Shared infrastructure (config, LLM, logger, errors)
├── score/        # Quality scoring (audio, caption, engagement, pacing)
├── validate/     # Validation systems
├── media/        # Media synthesis (Veo, Nanobanana, DepthFlow)
├── research/     # Research orchestration
├── feedback/     # Human feedback schema + JSONL store
├── lab/          # Experiment Lab (review UI)
└── test/stubs/   # Test fakes (FakeLLMProvider, etc.)
```

---

## Architecture Principles

1. **CLI-First** — commands are composable, each stage produces JSON artifacts
2. **Dependency Injection** — all providers via constructor; static factories for prod, test factories for fakes
3. **LLM-First Reasoning** — structured outputs via Zod schemas, not regex heuristics
4. **Configuration-Driven** — TOML/JSON config, environment variables for secrets
5. **Observability** — structured logging (Pino), cost tracking, progress callbacks

---

## Tech Stack

| Category   | Technology                                |
| ---------- | ----------------------------------------- |
| Language   | TypeScript 5.x, Node.js >= 20             |
| CLI        | Commander.js                              |
| LLM        | OpenAI, Anthropic, Google Gemini          |
| TTS        | kokoro-js (local, free)                   |
| ASR        | @remotion/whisper-cpp                     |
| Visuals    | Pexels, Nanobanana (AI), DepthFlow (2.5D) |
| Video      | Remotion 4.0                              |
| Validation | Zod schemas                               |
| Testing    | Vitest, promptfoo (LLM evals)             |

---

## Canonical Sources of Truth

- **Terminology**: `registry/ubiquitous-language.yaml` → `docs/reference/GLOSSARY.md`
- **Repo facts**: `registry/repo-facts.yaml` → `docs/reference/REPO-FACTS.md`, `docs/reference/ENVIRONMENT-VARIABLES.md`

Update workflow: edit the YAML, then run `npm run repo-facts:gen` or `npm run glossary:gen`.

---

## Commands

| Command        | Description                     |
| -------------- | ------------------------------- |
| `cm generate`  | Full pipeline: topic → video    |
| `cm script`    | Generate script from topic      |
| `cm audio`     | Generate voiceover + timestamps |
| `cm visuals`   | Find matching visuals           |
| `cm render`    | Render final video              |
| `cm demo`      | Render demo video (no API keys) |
| `cm doctor`    | Diagnose setup issues           |
| `cm init`      | Interactive setup wizard        |
| `cm templates` | Manage render templates         |
| `cm lab`       | Experiment Lab UI               |
| `cm feedback`  | Capture/export human feedback   |

---

## Testing

- **Framework**: Vitest (unit + integration + E2E)
- **Stubs**: `src/test/stubs/` — FakeLLMProvider, FakeTTSProvider, FakeASRProvider, etc.
- **LLM evals**: promptfoo configs in `evals/`
- **Quality gates**: lint, typecheck, format, test coverage, duplication — run `npm run quality`

---

## Development

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine && npm install && cp .env.example .env
npm run cm -- --help         # Run CLI from source
npm test                     # Watch mode
npm run quality              # All checks
```
