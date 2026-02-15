# Section Research: Virality Engineering (Packaging, Hook, Retention, Publish)

**Research Date:** 2026-01-05  
**Section:** Cross-cutting (applies to `cm script`, `cm visuals`, `cm render`, and proposed new CLI commands)  
**Status:** Proposed

---

## 1. Inputs (User-Provided SOPs)

This document synthesizes two tactical SOP-style guides for creating viral short-form content. The guides emphasize:

- **Packaging-first**: the title/thumbnail “package” sets the performance ceiling.
- **First 1–3 seconds**: hooks must stop the scroll, including muted autoplay.
- **Retention engineering**: fast pacing, micro-value, pattern interrupts, and satisfying payoff.
- **Production tactics**: caption style, visual dynamics, strategic audio, and A/B testing.
- **Publishing optimization**: description/hashtags/SEO placement and upload checklist.
- **Ethics**: high-risk tactics (rage bait / hook-only open loops) carry platform and trust risk.

---

## 2. Why This Matters for content-machine

Today, content-machine starts at `cm script` (topic → script.json), then proceeds through audio/visuals/render. The SOPs argue that **pre-script packaging** and **post-script/publish metadata** are major determinants of outcomes.

Most SOP tactics are implementable **without changing the 4-stage pipeline shape**, by:

1. Extending `script.json` with **packaging + retention plan** fields (or using `extra`).
2. Adding optional **pre** and **post** stages (`cm package`, `cm publish`, `cm score`) that emit artifacts.
3. Adding V&V quality gates (programmatic checks + LLM-as-judge) so “viral mechanics” are enforced consistently.

---

## 3. SOP → Pipeline Mapping (Where It Fits)

| SOP area                                         | What it means                                    | Best fit in content-machine                                                         | Output artifact                  |
| ------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------- |
| Ideation + packaging (title/thumbnail)           | “If you can’t package it, scrap it” quality gate | New Stage 0: `cm package` (or inside `cm script` as sub-step)                       | `packaging.json`                 |
| Hook (pattern interrupt, muted autoplay)         | Visual/text hook must work silently              | `cm script` (generate hook plan), `cm render` (hook overlay layer)                  | `script.json` + render props     |
| Hold (Hook–Hold–Payoff, problem→solution rhythm) | Structure + pacing, micro-value, open loops      | `cm script` prompt templates + schema                                               | `script.json`                    |
| Editing pace + pattern interrupts                | Visual changes ~2–3s, mid-video interrupts       | `cm script` (beat plan), `cm visuals` (more granular assets), `cm render` (effects) | `visuals.json` + render template |
| Captions (Hormozi-style)                         | Word-level captions, highlights, emphasis        | `cm audio` timestamps + `cm render` caption styling                                 | `timestamps.json` + render props |
| A/B testing                                      | Generate variants; track which wins              | `cm package` + V&V evals; store `promptVersion`/variant IDs                         | `packaging.json` + `score.json`  |
| Comment engineering                              | Ask an organic question; prompt discussion       | `cm script` CTA + `cm publish` description                                          | `script.json` + `publish.json`   |
| Publish checklist                                | Description/hashtags/cover text/SEO              | New post-stage: `cm publish`                                                        | `publish.json`                   |

---

## 4. Proposed New Artifacts

These artifacts integrate SOP steps while preserving the existing “stage outputs JSON artifacts” pattern:

- `packaging.json` (new): packaging variants and selected package.
- `script.json` (extend): include packaging reference + retention plan.
- `publish.json` (new): upload metadata + checklist.
- `score.json` (optional new): rubric scores (hook, retention, packaging) to support A/B and QA.

This keeps `audio.wav`, `timestamps.json`, `visuals.json`, and `video.mp4` unchanged.

---

## 5. Schema Extensions (Low-Risk Path First)

You already have `extra` fields in `src/script/schema.ts` and `src/script/schema.ts` → `ScriptOutputSchema.extra`, and `SceneSchema.extra`. Use these first to avoid breaking changes.

### 5.1 Suggested `script.json` shape (via `extra.virality`)

```json
{
  "extra": {
    "virality": {
      "platform": "tiktok",
      "riskProfile": "safe",
      "packaging": {
        "selectedTitle": "Redis vs Postgres: Which is ACTUALLY faster for caching?",
        "titleVariants": ["...", "..."],
        "thumbnailText": "Redis vs Postgres",
        "mutedHookText": "Stop scrolling: you’re caching wrong"
      },
      "hookPlan": {
        "patternInterrupt": "cold open with surprising stat",
        "visualHook": "big text + fast zoom",
        "audioHook": "stinger SFX then voice-in"
      },
      "retentionPlan": {
        "beats": [
          { "t": 0, "type": "hook", "note": "problem framing" },
          { "t": 2, "type": "patternInterrupt", "note": "stat overlay" }
        ],
        "commentPrompt": "Which one are you using and why?"
      }
    }
  }
}
```

### 5.2 When to promote to first-class fields

Once stable, promote to explicit Zod fields (and bump schema versions) if you need:

- CLI `--json` output guarantees for tooling.
- Render template behavior driven directly by `script.json`.
- Testing that asserts required virality fields exist.

---

## 6. Prompt Strategy: “Agentic” Without Overbuilding

The SOP implies a multi-step workflow. You can implement it as **multiple LLM calls inside `cm script`** without adopting a full agent framework yet.

### Option A: Single-call prompt upgrade (fastest)

Keep today’s `generateScript()` shape (`src/script/generator.ts`) and enhance prompts to require:

- A **packaging** section (title + thumbnail text + on-screen hook text).
- A **hook plan** for muted autoplay.
- A **retention plan** (beats/pattern interrupts every ~2–3s).
- An **organic comment prompt** as CTA or description seed.

### Option B: 3-step “Virality Director” inside `cm script` (recommended)

1. **Package**: generate 5–10 title variants + thumbnail text options; apply the “scrap if can’t package” rule.
2. **Script**: generate scenes using the chosen package; enforce Hook–Hold–Payoff and problem→solution rhythm.
3. **Polish**: simplify language, tighten sentences, add on-screen text cues and pattern interrupts.

Implementation uses your existing `LLMProvider` abstraction (`src/core/llm/provider.ts`) and JSON parsing patterns.

---

## 7. Quality Gates (Aligns With VV-FRAMEWORK)

Use your V&V layers to operationalize “virality mechanics” without pretending to predict virality:

### Layer 1: Schema validation

- Ensure all required fields exist and types are correct (Zod).

### Layer 2: Programmatic checks (cheap, deterministic)

- Hook length within a target range (e.g., 6–14 words).
- First value claim within first N words.
- Scene/beat cadence target (e.g., “new visual instruction” at least every 2–3 seconds).
- Reading simplicity (basic heuristic: average words per sentence, low jargon count).

### Layer 3: LLM-as-judge rubric (subjective but consistent)

- Packaging clarity score
- Hook strength / curiosity gap score (proxy for ECR)
- Retention plan plausibility score
- Safety/ethics flags (rage-bait / harassment / policy risk)

### Layer 4: Human review

- Quick skim checklist for any “risky” outputs or claims.

See also: `docs/dev/guides/VV-FRAMEWORK-20260105.md`.

---

## 8. Concrete Integration Points in Code

Recommended “where to add” locations:

- Script prompts: `src/script/prompts/index.ts`
  - Add packaging/hook/retention requirements and JSON fields.
- Script generation orchestration: `src/script/generator.ts`
  - Option B: multi-step calls (package → script → polish) with retries.
- Pipeline stages (optional new stage): `src/core/pipeline.ts`
  - Add `package` stage before `script`, or keep it inside `script`.
- CLI commands:
  - Add `src/cli/commands/package.ts` (new) → emits `packaging.json`
  - Add `src/cli/commands/publish.ts` (new) → emits `publish.json`
  - Add `src/cli/commands/score.ts` (optional) → emits `score.json` and exits non-zero on failure

---

## 9. Out of Scope for the Automated Pipeline (Still Document It)

The SOPs include operational tactics that are valuable but not cleanly automatable in MVP:

- Account optimization (public/pro account/category/keywords)
- “Training your feed” and competitor monitoring
- Post-publish distribution (story share, etc.)

These fit best as **manual checklist output** inside `publish.json` plus a companion guide.

---

## Related

- Architecture: `docs/dev/architecture/SYSTEM-DESIGN-20260104.md`
- Implementation plan: `docs/dev/architecture/IMPL-PHASE-1-SCRIPT-20260105.md`
- V&V framework: `docs/dev/guides/VV-FRAMEWORK-20260105.md`
- LLM eval patterns: `docs/research/investigations/RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md`
- Structured output reliability: `docs/research/investigations/RQ-04-STRUCTURED-LLM-OUTPUT-20260104.md`

## Engagement Prediction Integration (2026-01-06)

- `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`
- `docs/research/sections/SECTION-ENGAGEMENT-PREDICTION-20260106.md`
- `docs/research/88-engagement-prediction-integration-DEEP-20260106.md`
- `docs/research/virality-prediction/00-INDEX-20260106.md`
