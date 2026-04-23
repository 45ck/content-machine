# TASK-018: Feature — Virality Director (Score + Publish) — 20260106

**Type:** Feature  
**Priority:** P1  
**Status:** Done  
**Owner:** TBD  
**Depends On:** `cm package` + `cm script --package` (existing)

---

## Problem Statement

We have SOP guidance for packaging, hooks, retention, and publishing optimization, but we don’t yet have:

1. A machine-checkable **scoring artifact** (`score.json`) to gate quality/risk.
2. A **publish metadata artifact** (`publish.json`) to make uploads consistent.

We need an implementation that fits the CLI-first artifact pipeline and supports iteration without claiming to predict virality.

---

## Documentation Planning

Docs to create/update (date-suffixed):

- `docs/research/sections/SECTION-VIRALITY-DIRECTOR-INTEGRATION-20260106.md`
- `docs/research/investigations/RQ-27-VIRALITY-DIRECTOR-AGENTIC-PROMPTING-20260106.md`
- Optional: link these from `docs/dev/features/feature-virality-director-20260105.md`

---

## Testing Considerations

Deterministic checks should be unit-testable:

- `score.json` schema validation (Zod)
- Rules for packaging + script alignment (title match, hook alignment)
- Risk flags (rage-bait framing, hook-only open loop indicators)

LLM-as-judge scoring should be integration-tested via stubs (FakeLLMProvider) and/or prompt fixtures.

---

## Testing Plan (Write Before Implementation)

### `cm score`

- Given a valid `script.json`, score output validates against `ScoreOutputSchema`
- Given `script.json` with missing payoff (no resolution), score includes a retention flag
- Given packaging + script mismatch (title mismatch), score fails hard (or flags, per design)
- Given “rage bait” phrasing, score includes a safety flag (and blocks by default if configured)

### `cm publish`

- Given a valid `script.json`, output validates against `PublishOutputSchema`
- Includes a checklist with platform-specific items (TikTok/Reels/Shorts)
- Uses (optional) `packaging.json` cover text when present

---

## Implementation Plan

### 1) Schemas (Zod)

- Add `src/score/schema.ts`
  - `ScoreOutputSchema` (overall score, breakdown, flags, meta)
- Add `src/publish/schema.ts`
  - `PublishOutputSchema` (description, hashtags, keywords, cover text, checklist, meta)

### 2) Scoring Core (Deterministic First)

- Add `src/score/scorer.ts`
  - Proxy metrics:
    - hook length range
    - title clarity heuristics
    - scene count + estimated cadence
    - risk flags (open-loop only, inflammatory tone)
  - Optionally accept `packaging.json` for alignment checks

### 3) Publish Generator

- Add `src/publish/generator.ts`
  - LLM structured output (JSON only) for description + hashtags + checklist
  - `--mock` mode for deterministic tests

### 4) CLI Commands

- Add `src/cli/commands/score.ts`
  - `cm score --input script.json --package packaging.json --output score.json`
  - `--min-overall 0.80` optional gating
- Add `src/cli/commands/publish.ts`
  - `cm publish --input script.json --platform tiktok --output publish.json`

### 5) Pipeline Integration (Opt-in)

- Add flags to `cm generate` after `cm score` + `cm publish` are solid:
  - `--with-package`, `--with-score`, `--with-publish`, `--min-score`

---

## Acceptance Criteria

- `cm score` produces stable `score.json` and supports `--min-overall` gating. (`src/cli/commands/score.ts`, `src/score/*`)
- `cm publish` produces `publish.json` with description + hashtags + checklist, using `packaging.json` when provided. (`src/cli/commands/publish.ts`, `src/publish/*`)
- Quality gates: `npm run typecheck` and `npm run test:run` are green; repo-wide `npm run lint` / `npm run format:check` currently report pre-existing failures in unrelated files (tracked by TASK-010/011/012/016/017). (`package.json`, `tasks/todo/*`)
