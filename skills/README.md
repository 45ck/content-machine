# Skills

This directory holds agent-facing skills that Claude Code, Codex CLI,
and similar coding agents can load without reading the whole repository
first.

Role split:

- `skills/` = self-contained craft guides and playbooks
- `flows/` = prompt-language orchestration
- `scripts/harness/` = optional repo-side execution surfaces

## Purpose

- Keep agent-facing judgment close to the runtime implementation.
- Package visual, editorial, and technical know-how where agents will
  actually look first.
- Preserve the repo boundary from [`DIRECTION.md`](../DIRECTION.md):
  skills teach how to do the work well; runtime code exists to support
  execution, not replace the skill.

## Expected layout

Each skill should live in its own directory:

```text
skills/
  <skill-id>/
    SKILL.md
    prompts/          # optional
    examples/         # optional
    fixtures/         # optional
```

`<skill-id>` should be kebab-case and match the skill identifier used in
direction docs and flow manifests.

## For Claude Code and Codex CLI

Start with the local `SKILL.md`. A good skill document should let a
coding agent answer four questions fast:

1. When should this skill trigger?
2. What inputs does it need?
3. How should the work be done well?
4. What files or outcomes should the agent expect back?

If those answers are missing, the skill is not ready to ship.

Use a skill directly when you want one capability. Use a flow when you
want multiple skills composed under one run directory.

To install these skills into another project, use
[`docs/user/AGENT-HARNESS-INSTALL.md`](../docs/user/AGENT-HARNESS-INSTALL.md).
The install tool materializes `.content-machine/skills/` and rewrites
runtime entrypoints to the packaged `agent/run-tool.mjs` runner.

## Authoring rules

- Keep descriptions concrete enough that an agent can select the skill
  without guessing.
- Treat `SKILL.md` as the canonical guide for how the work should be
  done, not just how to call a script.
- Put style language, decision rules, failure cases, and technical
  mapping in the skill itself.
- Use bundled references when the skill needs more depth than one file
  should carry.
- Document side effects. If a skill writes to disk, say where.
- If scripts exist, describe them as implementation support, not the
  identity of the skill.
- Keep evaluation criteria near the skill so agents can verify
  outcomes consistently.
- Treat already-published shorts and demo reels as reference inputs,
  not raw render footage.
- If a skill uses local footage or gameplay clips, make the
  caption-clean requirement explicit. Burned-in source text should be
  rejected before render, not explained away after the fact.

## Suggested `SKILL.md` sections

Use [`_template/SKILL.md`](_template/SKILL.md) as the starting point for
new skills.

- Summary
- Trigger phrases / selection hints
- Inputs
- Outputs
- Style and technical approach
- Optional runtime or script surfaces
- Output behavior
- Constraints and non-goals
- Validation checklist

## Choose By Job

Use this matrix before scanning the exhaustive catalog.

| Job                              | Start With                                                                                                                                                                                           | Then Add                                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full topic-to-video run          | [`generate-short/`](generate-short/SKILL.md)                                                                                                                                                         | [`publish-prep-review/`](publish-prep-review/SKILL.md), [`short-form-production-playbook/`](short-form-production-playbook/SKILL.md)                                                           |
| Pick a short-form lane           | [`short-form-production-playbook/`](short-form-production-playbook/SKILL.md)                                                                                                                         | [`docs/user/ARCHETYPES.md`](../docs/user/ARCHETYPES.md), lane-specific skills                                                                                                                  |
| Reddit/story over gameplay       | [`reddit-post-over-gameplay-short/`](reddit-post-over-gameplay-short/SKILL.md)                                                                                                                       | [`reddit-card-overlay/`](reddit-card-overlay/SKILL.md), [`procedural-gameplay-backgrounds/`](procedural-gameplay-backgrounds/SKILL.md), captions                                               |
| Product or SaaS short            | [`saas-problem-solution-short/`](saas-problem-solution-short/SKILL.md)                                                                                                                               | [`ugc-avatar-short/`](ugc-avatar-short/SKILL.md), [`motion-design-coder/`](motion-design-coder/SKILL.md)                                                                                       |
| Educational cards or diagrams    | [`motion-card-lesson-short/`](motion-card-lesson-short/SKILL.md)                                                                                                                                     | [`motion-design-coder/`](motion-design-coder/SKILL.md), [`short-form-captions/`](short-form-captions/SKILL.md)                                                                                 |
| Longform to vertical clips       | [`longform-to-shorts/`](longform-to-shorts/SKILL.md) and [`longform-to-shorts.flow`](../flows/longform-to-shorts.flow)                                                                               | `source-media-analyze -> longform-highlight-select -> boundary-snap -> highlight-approval -> render-handoff`, then clip/reframe/render/review                                                  |
| One runtime stage                | [`brief-to-script/`](brief-to-script/SKILL.md), [`script-to-audio/`](script-to-audio/SKILL.md), [`timestamps-to-visuals/`](timestamps-to-visuals/SKILL.md), [`video-render/`](video-render/SKILL.md) | Use the matching `scripts/harness/` or installed `cm-agent` tool                                                                                                                               |
| Captions, timing, and sync       | [`short-form-captions/`](short-form-captions/SKILL.md)                                                                                                                                               | [`token-level-caption-timestamps/`](token-level-caption-timestamps/SKILL.md), [`timing-sync/`](timing-sync/SKILL.md), [`karaoke-ass-captions/`](karaoke-ass-captions/SKILL.md)                 |
| Source rights and reusable media | [`creative-source-scout/`](creative-source-scout/SKILL.md)                                                                                                                                           | [`source-media-review/`](source-media-review/SKILL.md), [`media-index/`](media-index/SKILL.md), [`asset-ledger/`](asset-ledger/SKILL.md)                                                       |
| Asset lifecycle and reruns       | [`asset-fingerprint-cache/`](asset-fingerprint-cache/SKILL.md)                                                                                                                                       | [`generated-asset-versioning/`](generated-asset-versioning/SKILL.md), [`partial-regeneration/`](partial-regeneration/SKILL.md), [`retry-with-cache/`](retry-with-cache/SKILL.md)               |
| Review and sendback loops        | [`publish-prep-review/`](publish-prep-review/SKILL.md)                                                                                                                                               | [`executive-producer-sendback/`](executive-producer-sendback/SKILL.md), [`scene-pacing-verifier/`](scene-pacing-verifier/SKILL.md), [`slideshow-risk-review/`](slideshow-risk-review/SKILL.md) |

## Shipped Skills

This is the exhaustive catalog. Prefer the job matrix above for fast
selection; use this list when checking whether a specific skill exists.

### Archetype And Production Planning

- [`short-form-production-playbook/`](short-form-production-playbook/SKILL.md)
  — hook-first editorial, visual assembly, and reject-regenerate craft
  guidance for making strong shorts
- [`short-form-archetype-research/`](short-form-archetype-research/SKILL.md)
  — curated vendor/repo research pack for choosing archetypes and
  translating patterns into skills, workflows, examples, and quality
  gates
- [`faceless-mixed-short/`](faceless-mixed-short/SKILL.md) — mixed
  stock/local/gameplay/AI-generated faceless short construction
- [`stock-footage-edutainment-short/`](stock-footage-edutainment-short/SKILL.md)
  — stock-first explainer lane with hard beat structure and per-scene
  visual intent
- [`animation-explainer-short/`](animation-explainer-short/SKILL.md) —
  diagrams, motion cards, generated scenes, and motion-led explainer
  shorts
- [`motion-design-coder/`](motion-design-coder/SKILL.md) — SVG,
  HTML/CSS, React, and Remotion animation craft rules for smoother,
  deterministic, phone-readable short-form motion
- [`motion-card-lesson-short/`](motion-card-lesson-short/SKILL.md) —
  narrow educational or quiz-like shorts built from timed card states
- [`micro-doc-breakdown-short/`](micro-doc-breakdown-short/SKILL.md) —
  documentary-style explainer shorts with archival cards, evidence
  inserts, timelines, narration, captions, and publish-prep review
- [`facts-listicle-short/`](facts-listicle-short/SKILL.md) — numbered
  or promise-driven fact shorts with one clear beat per fact
- [`gameplay-confession-short/`](gameplay-confession-short/SKILL.md) —
  confession/storytime shorts with motion or receipts on top and Subway
  Surfers-style gameplay below

### Creative Sourcing

- [`creative-source-scout/`](creative-source-scout/SKILL.md) —
  brainstorm, shortlist, and verify external creative sites for
  animation, UI components, 3D assets, stock media, audio, AI generation,
  and inspiration

### Longform And Source Media

- [`longform-to-shorts/`](longform-to-shorts/SKILL.md) — transcript-led
  clipping, selection, boundary cleanup, approval, and render handoff
  from long video
- [`longform-highlight-select/`](longform-highlight-select/SKILL.md) —
  rank short-form candidate moments from word-level timestamps
- [`highlight-approval/`](highlight-approval/SKILL.md) — approve or
  reject ranked highlight candidates before downstream processing
- [`reframe-vertical/`](reframe-vertical/SKILL.md) — speaker, face,
  cursor, and fallback portrait crop strategy
- [`face-or-screen-reframe/`](face-or-screen-reframe/SKILL.md) —
  branch early between face-led and screen-led portrait crop logic
- [`boundary-snap/`](boundary-snap/SKILL.md) — snap proposed clip
  boundaries to words, sentence ends, and silence
- [`text-selection-to-timestamps/`](text-selection-to-timestamps/SKILL.md)
  — recover exact ranges from transcript text selections
- [`token-level-caption-timestamps/`](token-level-caption-timestamps/SKILL.md)
  — capture word-level caption timing from real ASR tokens

### Story, Product, And Visual Lanes

- [`reddit-story-short/`](reddit-story-short/SKILL.md) — Reddit/text
  story adaptation into narration-led shorts
- [`reddit-post-over-gameplay-short/`](reddit-post-over-gameplay-short/SKILL.md)
  — default Reddit story mode with full-screen gameplay, opener card,
  and captions only
- [`text-message-drama-short/`](text-message-drama-short/SKILL.md) —
  DM, chat-log, and receipt-led story adaptation
- [`ugc-avatar-short/`](ugc-avatar-short/SKILL.md) — avatar or AI-actor
  spokesperson short construction
- [`saas-problem-solution-short/`](saas-problem-solution-short/SKILL.md)
  — creator-adjacent SaaS or product promo lane with proof/demo beats

### Additive Visual Treatments

- [`procedural-gameplay-backgrounds/`](procedural-gameplay-backgrounds/SKILL.md)
  — caption-clean 3D or procedural gameplay-like backgrounds that add
  retention motion without replacing the chosen lane

### Review, Regeneration, And Asset Control

- [`scene-by-scene-faceless-pipeline/`](scene-by-scene-faceless-pipeline/SKILL.md)
  — deterministic faceless short assembly with per-scene artifacts
- [`niche-profile-draft/`](niche-profile-draft/SKILL.md) — generate one
  niche-shaped draft artifact for script, visuals, and packaging
- [`draft-embedded-pipeline-state/`](draft-embedded-pipeline-state/SKILL.md)
  — keep resume state inside the working draft artifact itself
- [`slideshow-risk-review/`](slideshow-risk-review/SKILL.md) —
  repetition and weak-motion review for faceless or animation-heavy
  shorts
- [`scene-pacing-verifier/`](scene-pacing-verifier/SKILL.md) — verify
  narration cues and visual landmarks actually align
- [`source-media-review/`](source-media-review/SKILL.md) — audit source
  clips before planning or render
- [`source-media-analyze/`](source-media-analyze/SKILL.md) — probe
  source media locally for duration, stream, orientation, scene-change,
  silence, and audio-energy metadata; keep the v1 artifact stable while
  reusable analyzer ownership migrates to `@45ck/video-evaluator`
- [`media-index/`](media-index/SKILL.md) — maintain a local reusable
  media inventory
- [`style-profile-library/`](style-profile-library/SKILL.md) — save
  reusable local caption, pacing, and render style profiles
- [`scene-variation-check/`](scene-variation-check/SKILL.md) — catch
  repetitive, slideshow-like scene plans before generation
- [`shot-prompt-builder/`](shot-prompt-builder/SKILL.md) — turn scene
  plans into stronger generation prompts
- [`partial-regeneration/`](partial-regeneration/SKILL.md) — rerun only
  failed or missing stages instead of the whole project
- [`reddit-card-overlay/`](reddit-card-overlay/SKILL.md) — build
  reusable Reddit-style post overlays as visual assets
- [`hook-overlay/`](hook-overlay/SKILL.md) — turn the opening hook into
  a designed overlay asset instead of a normal subtitle
- [`hook-asset-verifier/`](hook-asset-verifier/SKILL.md) — verify the
  generated hook asset before timeline assembly
- [`timing-sync/`](timing-sync/SKILL.md) — reconcile real audio
  durations with planned scene timing before render
- [`continuity-chain/`](continuity-chain/SKILL.md) — generate connected
  AI-video scene chains with resume-safe continuity
- [`highlight-approval-loop/`](highlight-approval-loop/SKILL.md) —
  approve or regenerate selected highlight clips before downstream work
- [`retry-with-cache/`](retry-with-cache/SKILL.md) — rerun failed
  shorts while keeping valid generated assets
- [`karaoke-ass-captions/`](karaoke-ass-captions/SKILL.md) — build
  fixed-position ASS karaoke captions with active-word highlights
- [`storyboard-continuity-reference/`](storyboard-continuity-reference/SKILL.md)
  — use previous storyboard frames as controlled continuity references
- [`generated-asset-versioning/`](generated-asset-versioning/SKILL.md)
  — preserve revision history for generated media assets
- [`asset-fingerprint-cache/`](asset-fingerprint-cache/SKILL.md) —
  fingerprint live media assets for cache busting and change detection
- [`scene-aware-smart-crop/`](scene-aware-smart-crop/SKILL.md) —
  choose portrait crop strategy per real scene boundary
- [`executive-producer-sendback/`](executive-producer-sendback/SKILL.md)
  — run multi-stage production as a stateful pass/revise/send-back loop

### Caption And Support Skills

- [`short-form-captions/`](short-form-captions/SKILL.md) — caption
  design, pacing, highlighting, and implementation patterns

### Runtime-Backed Utility Skills

- [`doctor-report/`](doctor-report/SKILL.md) — structured environment
  and dependency diagnostics
- [`skill-catalog/`](skill-catalog/SKILL.md) — enumerate shipped skills,
  entrypoints, and example requests
- [`generate-short/`](generate-short/SKILL.md) — topic to full video
  run under one output directory
- [`asset-ledger/`](asset-ledger/SKILL.md) — build or update
  `asset-ledger.json` for publish-prep provenance review
- [`brief-to-script/`](brief-to-script/SKILL.md) — topic or blueprint to
  `script.json`
- [`reverse-engineer-winner/`](reverse-engineer-winner/SKILL.md) —
  reference short to VideoSpec/VideoTheme/blueprint files
- [`script-to-audio/`](script-to-audio/SKILL.md) — `script.json` to
  `audio.wav` + `timestamps.json`
- [`timestamps-to-visuals/`](timestamps-to-visuals/SKILL.md) —
  `timestamps.json` to `visuals.json`
- [`video-render/`](video-render/SKILL.md) — visuals + timestamps +
  audio files to `video.mp4`
- [`publish-prep-review/`](publish-prep-review/SKILL.md) — script +
  render review before upload

## Related docs

- [DIRECTION.md](../DIRECTION.md)
- [docs/user/ARCHETYPES.md](../docs/user/ARCHETYPES.md)
- [docs/user/CREATIVE-SOURCES.md](../docs/user/CREATIVE-SOURCES.md)
- [docs/user/QUALITY-AND-REVIEW.md](../docs/user/QUALITY-AND-REVIEW.md)
- [docs/direction/07-short-form-roadmap-20260424.md](../docs/direction/07-short-form-roadmap-20260424.md)
- [docs/direction/04-skill-catalog.md](../docs/direction/04-skill-catalog.md)
- [docs/research/archetypes/README.md](../docs/research/archetypes/README.md)
- [docs/direction/phases/phase-4-skills.md](../docs/direction/phases/phase-4-skills.md)
