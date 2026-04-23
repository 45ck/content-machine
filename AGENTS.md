# AGENTS.md

**content-machine** — short-form video skill pack for coding-agent CLIs.

> **Version:** 0.2.x | **License:** MIT | **Direction:** skills + `45ck/prompt-language` flows + runtime, with the legacy CLI demoted

This file provides context for AI coding agents (Copilot, Claude Code, Cursor, etc.). For human docs, see [README.md](README.md) and [docs/](docs/).

---

## Preferred Surfaces

Use these first when working as Claude Code, Codex CLI, or similar
coding-agent CLIs:

- `skills/*/SKILL.md` — skill contracts
- `flows/*.flow` — executable flow manifests
- `scripts/harness/*.ts` — deterministic JSON-stdio entrypoints
- `src/harness/*` — reusable logic behind those entrypoints
- `src/*` runtime modules — direct imports only when a runtime script
  does not exist yet

The legacy `cm` surface still exists, but new agent-facing work should
prefer skills, flows, and runtime scripts over adding more control-plane logic
to `src/cli/`.

## Agent Entry Points

```
node --import tsx scripts/harness/doctor-report.ts
node --import tsx scripts/harness/flow-catalog.ts
node --import tsx scripts/harness/run-flow.ts
node --import tsx scripts/harness/skill-catalog.ts
node --import tsx scripts/harness/generate-short.ts
node --import tsx scripts/harness/brief-to-script.ts
node --import tsx scripts/harness/ingest.ts
node --import tsx scripts/harness/publish-prep.ts
```

Current starter skills:

- `doctor-report`
- `skill-catalog`
- `generate-short`
- `brief-to-script`
- `reverse-engineer-winner`
- `script-to-audio`
- `timestamps-to-visuals`
- `video-render`
- `publish-prep-review`

## Legacy Pipeline Overview

The historical 4-stage CLI pipeline remains the bridge for runtime work:

| Stage   | Command      | Input           | Output                          |
| ------- | ------------ | --------------- | ------------------------------- |
| Script  | `cm script`  | Topic string    | `script.json`                   |
| Audio   | `cm audio`   | Script JSON     | `audio.wav` + `timestamps.json` |
| Visuals | `cm visuals` | Timestamps JSON | `visuals.json`                  |
| Render  | `cm render`  | All artifacts   | `video.mp4`                     |

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

1. **Skill Pack First** — prefer skills and JSON-stdio runtime scripts for agent-facing work
2. **Dependency Injection** — all providers via constructor; static factories for prod, test factories for fakes
3. **LLM-First Reasoning** — structured outputs via Zod schemas, not regex heuristics
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
| Validation | Zod schemas                               |
| Testing    | Vitest, promptfoo (LLM evals)             |

---

## Canonical Sources of Truth

- **Terminology**: `registry/ubiquitous-language.yaml` → `docs/reference/GLOSSARY.md`
- **Repo facts**: `registry/repo-facts.yaml` → `docs/reference/REPO-FACTS.md`, `docs/reference/ENVIRONMENT-VARIABLES.md`

Update workflow: edit the YAML, then run `npm run repo-facts:gen` or `npm run glossary:gen`.

---

## Important Paths

- `skills/` — skill contracts
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
node --import tsx scripts/harness/ingest.ts   # Run a runtime script from source
npm run cm -- --help                # Run legacy CLI from source
npm test                     # Watch mode
npm run quality              # All checks
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

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
