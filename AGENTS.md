# AGENTS.md

**content-machine** — short-form video skill pack for coding-agent CLIs.

> **Version:** 0.2.x | **License:** MIT | **Direction:** skills + `45ck/prompt-language` flows + runtime, with the legacy CLI demoted

This file provides context for AI coding agents (Copilot, Claude Code, Cursor, etc.). For human docs, see [README.md](README.md) and [docs/](docs/).

---

## Preferred Surfaces

Use these first when working as Claude Code, Codex CLI, or similar
coding-agent CLIs:

- `skills/*/SKILL.md` — skill docs
- `flows/*.flow` — executable flow manifests
- `scripts/harness/*.ts` — optional repo-side execution surfaces
- `src/harness/*` — reusable logic behind those surfaces
- `src/*` runtime modules — direct imports only when a runtime script
  does not exist yet

The legacy `cm` surface still exists, but new agent-facing work should
prefer skills and flows over adding more control-plane logic to
`src/cli/`. Runtime scripts exist to support the skills, not define
them.

## Agent Entry Points

```
node --import tsx scripts/harness/doctor-report.ts
node --import tsx scripts/harness/flow-catalog.ts
node --import tsx scripts/harness/run-flow.ts
node --import tsx scripts/harness/skill-catalog.ts
node --import tsx scripts/harness/generate-short.ts
node --import tsx scripts/harness/brief-to-script.ts
node --import tsx scripts/harness/ingest.ts
node --import tsx scripts/harness/longform-highlight-select.ts
node --import tsx scripts/harness/highlight-approval.ts
node --import tsx scripts/harness/boundary-snap.ts
node --import tsx scripts/harness/source-media-analyze.ts
node --import tsx scripts/harness/media-index.ts
node --import tsx scripts/harness/style-profile-library.ts
node --import tsx scripts/harness/publish-prep.ts
```

Current starter skills:

- `doctor-report`
- `skill-catalog`
- `short-form-captions`
- `generate-short`
- `brief-to-script`
- `longform-highlight-select`
- `highlight-approval`
- `boundary-snap`
- `source-media-analyze`
- `media-index`
- `style-profile-library`
- `reverse-engineer-winner`
- `script-to-audio`
- `timestamps-to-visuals`
- `video-render`
- `publish-prep-review`

## Legacy Pipeline Overview

The historical 4-stage CLI pipeline remains the bridge for runtime work:

| Stage   | Command      | Input                    | Output                          |
| ------- | ------------ | ------------------------ | ------------------------------- |
| Script  | `cm script`  | Topic string             | `script.json`                   |
| Audio   | `cm audio`   | Script JSON              | `audio.wav` + `timestamps.json` |
| Visuals | `cm visuals` | Timestamps JSON          | `visuals.json`                  |
| Render  | `cm render`  | Script + audio + visuals | `video.mp4`                     |

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
├── feedback/     # Human feedback model + JSONL store
├── lab/          # Experiment Lab (review UI)
└── test/stubs/   # Test fakes (FakeLLMProvider, etc.)
```

---

## Architecture Principles

1. **Skill Pack First** — prefer skill docs and flow docs for agent-facing work; runtime scripts back execution when needed
2. **Dependency Injection** — all providers via constructor; static factories for prod, test factories for fakes
3. **LLM-First Reasoning** — structured outputs via validators, not regex heuristics
4. **Configuration-Driven** — TOML/JSON config, environment variables for secrets
5. **Observability** — structured logging (Pino), cost tracking, progress callbacks

---

## Tech Stack

| Category   | Technology                                |
| ---------- | ----------------------------------------- |
| Language   | TypeScript 5.x, Node.js >= 20.6           |
| CLI        | Commander.js                              |
| LLM        | OpenAI, Anthropic, Google Gemini          |
| TTS        | kokoro-js (local, free)                   |
| ASR        | @remotion/whisper-cpp                     |
| Visuals    | Pexels, Nanobanana (AI), DepthFlow (2.5D) |
| Video      | Remotion 4.0                              |
| Validation | Zod validation                            |
| Testing    | Vitest, promptfoo (LLM evals)             |

---

## Canonical Sources of Truth

- **Terminology**: `registry/ubiquitous-language.yaml` → `docs/reference/GLOSSARY.md`
- **Repo facts**: `registry/repo-facts.yaml` → `docs/reference/REPO-FACTS.md`, `docs/reference/ENVIRONMENT-VARIABLES.md`

Update workflow: edit the YAML, then run `npm run repo-facts:gen` or `npm run glossary:gen`.

---

## Important Paths

- `skills/` — skill docs
- `flows/` — `45ck/prompt-language` flow docs plus executable `.flow` manifests
- `scripts/harness/` — deterministic JSON-stdio entrypoints
- `docs/direction/` — migration plan and boundaries
- `archive/legacy-cli/` — frozen landing zone for surfaces that will be demoted or removed

## CLI Commands Still Worth Knowing

- `cm doctor`
- `cm script`
- `cm audio`
- `cm visuals`
- `cm render`
- `cm publish`
- `cm validate`

---

## Local Testing

- **Framework**: Vitest (unit + integration + E2E)
- **Stubs**: `src/test/stubs/` — FakeLLMProvider, FakeTTSProvider, FakeASRProvider, etc.
- **LLM evals**: promptfoo configs in `evals/`
- **Local checks**: typecheck, lint, format, and Vitest — run `npm run quality`

---

## Development

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine && npm install && cp .env.example .env
node --import tsx scripts/harness/ingest.ts   # Run a runtime script from source
npm run cm -- --help                # Run legacy CLI from source
npm test                     # Watch mode
npm run quality              # Local checks
```

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

Keep work local unless the user explicitly asks for a push or release.
Before handoff, run the focused local checks that match the changed
surface, summarize what passed, and leave the worktree status clear.

<!-- END BEADS INTEGRATION -->
