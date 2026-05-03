# AGENTS.md

**content-machine** — local-first short-form video skill pack and runtime for coding-agent CLIs.

> **Version:** 0.2.x | **License:** MIT | **Direction:** skills + `45ck/prompt-language` flows + deterministic runtime, with the legacy CLI demoted

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

## Installed Pack Context

When this repo is installed inside another project, the materialized
pack should live under `.content-machine/`. Agents should read
`.content-machine/README.md`, `.content-machine/AGENTS.md`, and the
relevant `.content-machine/skills/*/SKILL.md` before running tools.
Packaged runtime calls should use:

```bash
npx --no-install cm-agent <tool>
```

For installed flows, pass `"flowsDir": ".content-machine/flows"` to
`run-flow` or `flow-catalog`.

## Agent Entry Points

If Content Machine is installed into another project as
`.content-machine/`, do not use the source-checkout
`scripts/harness/*` commands below. Use `npx --no-install cm-agent <tool>`
from that project and pass `.content-machine/skills` or
`.content-machine/flows` explicitly.

```
node --import tsx scripts/harness/doctor-report.ts
node --import tsx scripts/harness/flow-catalog.ts
node --import tsx scripts/harness/run-flow.ts
node --import tsx scripts/harness/skill-catalog.ts
node --import tsx scripts/harness/generate-short.ts
node --import tsx scripts/harness/asset-ledger.ts
node --import tsx scripts/harness/brief-to-script.ts
node --import tsx scripts/harness/ingest.ts
node --import tsx scripts/harness/reverse-engineer-winner.ts
node --import tsx scripts/harness/longform-to-shorts.ts
node --import tsx scripts/harness/longform-highlight-select.ts
node --import tsx scripts/harness/highlight-approval.ts
node --import tsx scripts/harness/boundary-snap.ts
node --import tsx scripts/harness/source-media-analyze.ts
node --import tsx scripts/harness/media-index.ts
node --import tsx scripts/harness/style-profile-library.ts
node --import tsx scripts/harness/script-to-audio.ts
node --import tsx scripts/harness/timestamps-to-visuals.ts
node --import tsx scripts/harness/video-render.ts
node --import tsx scripts/harness/caption-export.ts
node --import tsx scripts/harness/publish-prep.ts
node --import tsx scripts/harness/publish-prep-review.ts
node --import tsx scripts/harness/reddit-story-assets.ts
node --import tsx scripts/harness/install-skill-pack.ts
```

Discover the live skill and flow surface instead of relying on a static
list:

```bash
cat <<'JSON' | node --import tsx scripts/harness/skill-catalog.ts
{}
JSON

cat <<'JSON' | node --import tsx scripts/harness/flow-catalog.ts
{}
JSON
```

## Current Short-Form Path

The active agent path is skill and harness driven:

```text
source-media-analyze
  -> longform-highlight-select
  -> boundary-snap
  -> highlight-approval
  -> render-handoff.v1.json
```

For topic-to-video generation, use `generate-short` or the
`generate-short` flow. For longform-to-short planning, use
`longform-to-shorts` or the `longform-to-shorts` flow, then cut/reframe
approved source ranges and build render inputs before `video-render`.

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
5. **Observability** — structured logging (Pino), cost tracking, progress callbacks, JSONL progress events

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
- `scripts/harness/` — optional repo-side runners
- `docs/direction/` — migration plan and boundaries
- `archive/legacy-cli/` — frozen landing zone for surfaces that will be demoted or removed

## Thin `cm` Shell

The live `cm` surface is intentionally small. Use it for config,
diagnostics, MCP, and render compatibility. New agent-facing work should
prefer skills, flows, and `scripts/harness/*`.

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

This project uses **bd (beads)** for issue tracking when the `bd`
binary is installed. Run `bd prime` to see full workflow context and
commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking when available — do NOT use
  TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close
  protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md
  files

## Session Completion

Keep work local unless the user explicitly asks for a push or release.
Before handoff, run the focused local checks that match the changed
surface, summarize what passed, and leave the worktree status clear.

<!-- END BEADS INTEGRATION -->
