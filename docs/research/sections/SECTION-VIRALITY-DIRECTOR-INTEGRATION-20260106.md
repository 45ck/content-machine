# Section Research: Virality Director Integration (SOP → CLI + Pipeline)

**Research Date:** 2026-01-06  
**Status:** Proposed → Implementation Plan Ready  
**Scope:** Operationalize the two provided SOPs inside `content-machine` with minimal disruption to the core 4-stage pipeline.

---

## 1. Executive Summary

The SOPs focus on controllable inputs (packaging clarity, hook effectiveness, retention structure, publish metadata). In `content-machine`, these map cleanly to optional, composable CLI stages and artifacts:

- **Pre-script packaging**: `cm package` → `packaging.json`
- **Script constraints**: `cm script --package packaging.json` → `script.json`
- **Publish metadata**: `cm publish --input script.json` → `publish.json` (new)
- **Scoring + gating**: `cm score --input script.json [--package packaging.json]` → `score.json` (new)

This keeps `cm audio`, `cm visuals`, and `cm render` stable, while enabling an opt-in “Virality Director” mode in `cm generate` later.

---

## 2. SOP → Pipeline Mapping

| SOP concept                                           | What it means                                             | Best place in repo                                                       | Artifact                             |
| ----------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| Packaging-first (“if you can’t package it, scrap it”) | Title + cover text + muted hook are mandatory constraints | `src/package/*`, `src/cli/commands/package.ts`                           | `packaging.json`                     |
| Hook layering (visual + text + audio)                 | Must stop scroll on muted autoplay                        | `src/script/prompts/*` (hook constraints), later `src/render/*` overlays | `script.json` (+ render props later) |
| Hook–Hold–Payoff; problem→solution rhythm             | Retention architecture                                    | `src/script/*` + prompt templates                                        | `script.json`                        |
| Fast pacing / pattern interrupts                      | Scene cadence + editing cues                              | `src/script/*` (micro-directions), later `src/render/*`                  | `script.json` (+ render props later) |
| Caption style (word-by-word highlights)               | Execution tactic                                          | `src/render/remotion/*` + timestamps                                     | `video.mp4`                          |
| Publishing checklist (SEO placements, hashtags)       | Metadata + QA checklist                                   | `src/publish/*`, `src/cli/commands/publish.ts`                           | `publish.json`                       |
| A/B testing titles/covers                             | Multiple variants + tracking                              | `packaging.json` variants + promptVersion/variant IDs                    | `packaging.json`                     |
| High-risk tactics (rage bait / hook-only open loop)   | Must be flagged/blocked by default                        | `src/score/*` + safety checks                                            | `score.json`                         |

---

## 3. Integration Options (Where to Add It)

### Option A (recommended): Composable commands, no pipeline shape change

- Add `cm publish` and `cm score` and keep them optional.
- Users compose stages manually:
  - `cm package` → `cm script --package` → `cm audio` → `cm visuals` → `cm render`
  - `cm publish` and/or `cm score` can run after `cm script`.

### Option B: Opt-in pipeline stages inside `cm generate`

Add flags to `cm generate`:

- `--with-package` runs `cm package` before `cm script`
- `--with-score` runs `cm score` and blocks if below threshold
- `--with-publish` runs `cm publish` at the end

Implement in the orchestration layer (the wrapper used by `cm generate`).

---

## 4. Concrete Code Touchpoints

- CLI:
  - `src/cli/index.ts` (register commands)
  - `src/cli/commands/package.ts` (existing)
  - `src/cli/commands/script.ts` (consume `--package`)
  - `src/cli/commands/publish.ts` (new)
  - `src/cli/commands/score.ts` (new)
- Schemas:
  - `src/package/schema.ts`
  - `src/publish/schema.ts` (new)
  - `src/score/schema.ts` (new)
- Prompting:
  - `src/script/prompts/index.ts` (inject “PACKAGING (must follow)” block)
  - `src/core/llm/*` (structured outputs + JSON mode)

---

## 5. Quality Gates (How to Make SOPs Enforceable)

Use the existing V&V pattern:

1. **Schema validation** (Zod) for every artifact
2. **Deterministic checks** (word ranges, structural checks, banned patterns)
3. **LLM-as-judge (optional)** for subjective scoring (clickability, clarity, tone)
4. **Human review** when risk flags fire

See: `docs/research/investigations/RQ-25-VIRALITY-OPTIMIZATION-QUALITY-GATES-20260105.md`.

---

## 6. Recommended Next Implementation Slice

1. Implement `cm score` (deterministic checks first; judge later).
2. Implement `cm publish` (metadata + checklist generation).
3. Add `cm generate --with-*` flags (opt-in integration).
