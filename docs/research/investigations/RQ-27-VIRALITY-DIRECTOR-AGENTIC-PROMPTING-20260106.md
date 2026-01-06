# RQ-27: Virality Director — Agentic Prompting + Context Engineering

**Date:** 2026-01-06  
**Status:** Proposed  
**Question:** How do we turn the SOP tactics (packaging, hooks, retention, publish optimization) into reliable, repeatable LLM behavior inside `content-machine`?

---

## 1. Problem Statement

The SOPs describe a tactical workflow, but LLM outputs drift unless we:

- Make constraints explicit and machine-checkable (schemas, rules, rubrics)
- Separate generation from critique (producer vs judge roles)
- Track prompt versions + decisions so improvements are measurable

We want iteration (bounded retries) without building a fragile multi-agent framework.

---

## 2. Recommended Pattern: Producer + Deterministic Gates + Optional Judge

### 2.1 Producer stages (LLM generation)

- **Packaging Producer**: generate variants → pick best (via deterministic scorer)
- **Script Producer**: generate scenes constrained by chosen package
- **Publish Producer**: generate metadata + checklist (no auto-upload)

### 2.2 Deterministic gates (fast, cheap, testable)

Examples:

- Title: word-count range, no puns, no punctuation spam
- Cover text: 2–6 words, mobile readable, no line breaks
- Hook alignment: first spoken line must match on-screen hook promise
- Scene cadence: minimum scene count; no scene longer than N seconds (proxy)
- Safety: flag rage-bait framing, harassment, medical/legal certainty claims

### 2.3 Optional Judge (LLM-as-judge) with bounded retries

Use only when deterministic checks pass but “quality” still matters:

- Clickability / clarity / curiosity gap
- Retention structure adherence (Hook–Hold–Payoff)
- Tone and audience-fit (TikTok-style, not corporate)

Persist a trace:

- `meta.model`
- `meta.promptVersion`
- rubric version
- scores + reasons

---

## 3. Context Engineering Per Stage

### 3.1 Packaging stage (`cm package`)

Inputs:

- Topic
- Platform (tiktok/reels/shorts)
- Risk profile (default safe; avoid high-risk tactics)

Outputs:

- `packaging.json` with `variants[]`, `selected`, scoring metadata

Reliability:

- Require “JSON only” + validate with Zod (`src/package/schema.ts`)
- If parse fails, retry with stricter system message and lower temperature

### 3.2 Script stage (`cm script --package`)

Inputs:

- Topic + archetype + target duration/word count
- Selected package: `title`, `coverText`, `onScreenHook`

Hard constraints:

- Title must match exactly
- First spoken line must satisfy the on-screen hook promise

Mechanism:

- Inject a packaging constraint block in the archetype prompt templates (single source of truth in `src/script/prompts/index.ts`)

### 3.3 Publish stage (`cm publish`)

Inputs:

- Script (title/hook/CTA/hashtags + scenes)
- Platform targeting rules
- Optional SEO keyword

Outputs:

- Description
- Hashtags set
- Checklist (SEO placements, cover legibility, upload quality)

---

## 4. “Agentic” Loop Without a Framework

Implement a small, testable loop:

1. Generate candidate output (producer)
2. Run deterministic checks (gate)
3. If fails and retries remain:
   - append failures as a structured fix list
   - regenerate with the same schema
4. If passes:
   - (optional) judge-score; if below threshold, regenerate with judge feedback

Keep retries bounded and log all attempts for later evals.

---

## 5. Provider Integration (OpenAI + Anthropic)

Given `src/core/llm/*`:

- Prefer structured output / JSON mode
- Always Zod-validate after parsing
- On schema failure, log a redacted excerpt and retry
- Record cost if usage tokens are available

---

## 6. Risks + Mitigations

- Rage bait / contrarian hooks: default-flag; require explicit opt-in to relax (still enforce policy blocks).
- Overconfident claims: add “certainty without sources” heuristic + judge rubric.
- Prompt drift: prompt versioning + fixtures + promptfoo evals.
- Cost blowups: deterministic gates first, bounded retries.

---

## 7. Recommended Next Step

Implement `cm score` as the central deterministic gate artifact (no judge initially). Then add `cm publish`. Only after both exist, wire `cm generate --with-*` flags.
