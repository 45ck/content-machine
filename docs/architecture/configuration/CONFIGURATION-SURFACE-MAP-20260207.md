# Configuration Surface Map - 20260207

Purpose: make "fully configurable" concrete by listing every major subsystem and where its configuration should live.

This is intentionally a living map. It is used to:

- prevent "new knobs" from being added only as CLI flags
- keep config schema, CLI flags, and docs aligned
- ensure Experiment Lab can attribute A/B changes to config deltas

## Canonical Layers (Precedence)

Low -> high priority:

1. Built-in defaults (Zod defaults in code)
2. Pack defaults (installed packs)
3. User config (global)
4. Project config (repo/project)
5. Workflow defaults
6. Template defaults
7. Recipe spec (per-run)
8. CLI flags

## Script Stage

Configuration targets:

- LLM provider/model/temperature/retries
- archetype selection and archetype-specific tuning
- prompt templates and variables
- research injection policy (optional)
- packaging constraints (title/cover/on-screen hook)

Proposed canonical config paths:

- `llm.*` (already exists)
- `script.durationSeconds` (default duration for `cm script` / `cm generate`)
- `script.archetype` (default archetype)
- `script.prompts.pack` (prompt pack id/path)
- `script.prompts.overrides.<archetype>` (optional per-archetype overrides)

Notes:

- Today prompts are TypeScript strings (`src/script/prompts/index.ts`). "Fully configurable" requires external prompt templates (pack or path), but keep a safe fallback to built-ins.

## Audio Stage

Configuration targets:

- TTS engine + voice + speed
- ASR engine + model + reconcile settings
- sync strategy defaults (audio-first vs standard)
- mixing defaults: LUFS targets, music ducking, SFX placement, ambience

Canonical config paths (mostly exist today):

- `audio.ttsEngine`, `audio.asrEngine`, `audio.asrModel`
- `sync.*`
- `audioMix.*`, `music.*`, `sfx.*`, `ambience.*`

Potential additions:

- `audio.ttsSpeed`
- `audio.voiceFallbacks` (voice selection strategy)

## Visuals Stage

Configuration targets:

- stock provider selection + fallback ordering
- cache behavior
- search term generation and filtering (portrait bias, duration, etc)
- style constraints (b-roll pacing, scene coverage, gameplay clips)

Canonical config paths:

- `visuals.provider`, `visuals.cacheEnabled`, `visuals.cacheTtl` (exists)
- `visuals.fallbackProviders[]` (new; replaces ad-hoc flags)
- `visuals.search.*` (new; query generation knobs)
- `visuals.filters.*` (new; orientation/duration constraints)

Packs:

- gameplay libraries and clips should be treatable as assets/packs with manifests.

## Render Stage

Configuration targets:

- template selection (composition + defaults)
- caption presets and deep overrides
- safe-area presets per platform
- animation system knobs (page + active-word)
- font families and font sources
- download/embedding of remote assets into the bundle

Canonical config paths:

- `render.template` (new; default template id/path)
- `render.fps`, `render.codec`, `render.crf` (exists partly)
- `captions.preset` (new; default caption preset)
- `captions.config` (new; `CaptionConfigSchema.deepPartial()` override)
- `captions.fonts` / `captions.fontFile` / `captions.fontFamily` (exists)

Notes:

- Templates already support `captionPreset` and `captionConfig`. Config should be able to set the same, and the precedence order must be tested.

## Validation + Quality Gates

Configuration targets:

- platform profiles and thresholds (duration min, cadence, BRISQUE, safe areas)
- caption OCR quality gates thresholds
- sync rating thresholds and auto-retry policies

Canonical config paths (proposed):

- `validate.profile` and `validate.gates.*`
- `quality.sync.*`
- `quality.captions.*`

Notes:

- Keep "strictness" defaults conservative; provide profiles (fast/standard/quality/maximum) like sync presets.

## Scoring / Evals

Configuration targets:

- scoring heuristic weights
- LLM-as-judge prompts / models (if used)
- regression suites for quality tracking

Canonical config paths (proposed):

- `evals.enabled`
- `evals.suites[]`
- `score.weights.*`

## Experiment Lab Integration

Required data contract:

- A/B comparisons must be able to show:
  - the two artifacts (videos)
  - the hypothesis
  - the resolved config diff (what actually changed)
  - human ratings (motion, captions, etc)

This implies:

- RunSpec artifacts should be written and referenced in experiments.
- `cm lab compare` should accept either:
  - video paths, or
  - RunSpec paths (preferred, because config provenance becomes first-class).
