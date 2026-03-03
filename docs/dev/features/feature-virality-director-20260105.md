# Feature: Virality Director (Packaging + Publish Metadata)

**Date:** 2026-01-05  
**Status:** Proposal  
**Owner:** content-machine

---

## 1. Summary

Add an optional “Virality Director” capability to content-machine that turns the two SOPs into executable steps:

- **Pre-script packaging**: generate/score/select title + thumbnail/cover text + hook text.
- **Script retention plan**: enforce Hook–Hold–Payoff and fast pacing cues.
- **Publish metadata**: description/hashtags/SEO checklist output (no auto-upload).

This is implemented as **new CLI commands** and optional pipeline gating, without changing the existing 4-stage core unless explicitly enabled.

---

## 2. Goals

- Provide packaging artifacts (`packaging.json`) that can be A/B tested.
- Improve script quality (hook clarity, pacing, retention) via structured outputs.
- Emit upload-ready metadata (`publish.json`) and a checklist.
- Add a scoring system (`score.json`) that can gate `cm generate`.

---

## 3. Non-Goals

- Guarantee virality or predict platform metrics.
- Automate account configuration, “training the feed”, or competitor monitoring.
- Upload videos to TikTok/IG/YouTube (post-MVP).

---

## 4. Proposed CLI Commands

### 4.1 `cm package`

Generate packaging variants from a topic:

```bash
cm package "Redis vs PostgreSQL for caching" --platform tiktok --output packaging.json
```

Outputs:

- `packaging.json`: title variants, cover/thumbnail text, hook text overlays, selected/default choice.

### 4.2 `cm script` (extended)

Accept a package file (optional):

```bash
cm script --topic "..." --archetype versus --package packaging.json --output script.json
```

Behavior:

- Uses the selected package to drive script structure and hook wording.
- Writes packaging reference into `script.extra.virality.packaging` (or first-class fields later).

### 4.3 `cm publish`

Generate upload metadata + checklist:

```bash
cm publish --input script.json --platform tiktok --output publish.json
```

Outputs:

- `publish.json`: description, hashtag set, SEO keyword placements, cover text, post checklist.

### 4.4 `cm score` (optional)

Score a script/package against rubrics:

```bash
cm score --input script.json --min-overall 0.80 --output score.json
```

See: `docs/research/investigations/RQ-25-VIRALITY-OPTIMIZATION-QUALITY-GATES-20260105.md`.

---

## 5. Pipeline Integration Options

### Option A: Keep it as separate tools (least invasive)

- `cm generate` remains unchanged.
- Power users chain:
  - `cm package` → `cm script --package` → `cm generate --keep-artifacts`

### Option B: Add Stage 0 and Stage 5 to the pipeline (opt-in)

- Add `package` before `script` and `publish` after `render` in `src/core/pipeline.ts`.
- Enable with `cm generate --with-package --with-publish --min-score 0.80`.

---

## 6. Implementation Sketch (File Layout)

Suggested minimal structure:

```
src/package/
  generator.ts
  schema.ts
src/publish/
  generator.ts
  schema.ts
src/score/
  scorer.ts
  schema.ts
src/cli/commands/
  package.ts
  publish.ts
  score.ts
```

All components follow existing patterns:

- LLM provider abstraction: `src/core/llm/*`
- Config: `src/core/config.ts`
- Zod schemas: existing `src/*/schema.ts` pattern
- JSON artifacts written by CLI utils: `src/cli/utils.ts`

---

## 7. Safety / Risk Controls

- Default `riskProfile = safe`.
- Add `--risk safe|spicy|edgy` but keep hard blocks for harassment and disallowed content.
- If “hook-only open loop” requested, require explicit `--allow-open-loop` and emit warning in outputs.

---

## 8. Acceptance Criteria

- `cm package` produces valid `packaging.json` with 5+ title variants and cover text.
- `cm script --package` incorporates selected title/hook into `script.json`.
- `cm publish` produces a structured description + hashtags + checklist.
- `cm score` outputs a stable `score.json` and supports threshold gating.

---

## Related

- SOP mapping: `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`
- Quality gates: `docs/research/investigations/RQ-25-VIRALITY-OPTIMIZATION-QUALITY-GATES-20260105.md`
- V&V framework: `docs/dev/guides/VV-FRAMEWORK-20260105.md`
