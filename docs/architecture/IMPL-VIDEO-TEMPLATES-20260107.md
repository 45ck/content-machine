# IMPL: Video Templates (Data-First) (20260107)

**Date:** 2026-01-07  
**Status:** Implementation Ready  
**Owners:** content-machine core

---

## Summary

This document defines how we expand video templates into a **platform-grade**, CLI-first customization system while preserving security, determinism, and backwards compatibility.

Recommended engineering path:

1. **Data-only templates** (JSON + optional assets) with schema validation and safe defaults
2. More power via **built-in compositions + typed `params/assets`**
3. Optional **trusted plugin mode** later (explicit opt-in) if needed

---

## Current State (Baseline)

Implemented today:

- `cm render --template <id|path>` resolves a template by id/path and applies defaults safely
- `cm generate --template <id|path>` resolves a template and threads defaults into the pipeline render stage
- Template defaults currently influence:
  - `orientation`, `fps`, `captionPreset`, `captionConfig` (partial)
  - `compositionId` for Remotion composition selection (default remains `ShortVideo`)
- Backwards compatibility is preserved via: apply template defaults only when the CLI flag value source is `default`

Not implemented yet:

- `assets` and `params` consumption by compositions
- multiple compositions (only `ShortVideo` exists today)

---

## North Star Goals

Templates should be:

- **Comprehensive**: cover layout, typography, effects, overlays, and background selection policy
- **Composable**: templates + archetypes + CLI overrides merge predictably
- **Shareable**: installable packs; deterministic and portable
- **Auditable**: clear source, version, and resolved snapshot in outputs
- **Safe by default**: no arbitrary code execution; strict path and asset handling

---

## Concepts & Separation of Concerns

### Archetype (content)

Archetypes shape “what we say”:

- script structure (hook/body/cta)
- pacing and tone
- (optionally) style defaults

### Template (presentation)

Templates shape “how it looks”:

- Remotion composition selection (`compositionId`)
- render defaults (`fps`, `orientation`)
- captions defaults (preset + config partials)
- layout-specific knobs (`params`) and asset slots (`assets`)

### Presets / Themes (styling primitives)

Reusable styling building blocks:

- caption presets (TikTok / Reels / YouTube / etc)
- theme registry and tokens

Templates should prefer selecting presets and applying small overrides instead of embedding large token dumps.

---

## Extensibility Ladder (How Far We Can Go)

### Level 1 — Data-only render defaults (current)

**Enables:** one-flag switches for caption styling + simple render defaults.

- `compositionId` selection
- `orientation`, `fps`
- caption preset + partial caption config

**Pros:** safest, highly testable, minimal compatibility surface.  
**Cons:** can’t express new layouts unless we add new built-in compositions.

### Level 2 — Parametric built-in compositions (recommended)

**Enables:** real format differences (split-screen gameplay, audiograms, overlays) using typed `params/assets`.

- `template.params` controls layout knobs (e.g. `splitScreenRatio`)
- `template.assets` provides normalized “slots” (gameplay library, overlays, fonts)
- `RenderProps` carries template metadata/params/assets into Remotion components

**Pros:** still safe-by-default, stable UX, strong reproducibility, no dependency hell.  
**Cons:** we must implement compositions and keep param schemas maintained.

### Level 3 — Template-driven pipeline defaults (optional)

**Enables:** templates steer earlier stages, not just render.

- visuals policy (stock vs gameplay vs user-footage)
- caption grouping / pacing knobs influencing timestamps and paging

**Pros:** “one template flag” can produce truly different videos end-to-end.  
**Cons:** higher coupling between stages; requires strict schema versioning/migrations.

### Level 4 — Trusted plugin mode (future, explicit opt-in)

**Enables:** templates can bring their own Remotion project/code (custom compositions).

**Pros:** unlimited flexibility and ecosystem potential.  
**Cons:** security, dependency conflicts, support burden, and version pinning complexity.

Default stance: **Level 1–3 are the platform path**. Level 4 is only for trusted, power-user workflows.

---

## Data Model (v1 → v2)

### v1 (existing)

`template.json` supports:

- `compositionId` (Remotion composition id)
- `defaults`:
  - `orientation`, `fps`
  - `captionPreset`, `captionConfig` (deep-partial)
  - `archetype` (optional)
- `assets` and `params` reserved for future expansion

### v2 (recommended)

Expand the schema with strongly-typed sections:

- `defaults.render`: codec/crf, fps, orientation (where supported)
- `defaults.captions`: preset + config partials
- `defaults.visuals`: visual policy defaults (stock vs gameplay vs user-footage)
- `params`: composition-specific knobs (typed per composition)
- `assets`: standard “slots” with safe path handling

Add platform compatibility metadata:

- `templateVersion` (semver)
- `minCmVersion` and `minRemotionVersion` (optional)
- `capabilities` (declares which keys are used/required)

---

## Template Resolution & Merge Rules

### Resolution

Support:

- `--template <id>`: resolve built-in → project → user
- `--template <path|dir>`: load file or `<dir>/template.json`

### Merge order (recommended)

For each stage (script/audio/visuals/render):

1. Hard defaults (code)
2. `.content-machine.toml` defaults (project/user config)
3. Template defaults
4. Archetype defaults (or the reverse; pick one and codify it)
5. Explicit CLI flags (always win)

Critical rule:

- **Explicit CLI flags must always win** over template/config/archetype defaults.

---

## Render Architecture (Platform-grade)

### Composition registry

Add more built-in compositions registered in `src/render/remotion/index.ts`:

- `ShortVideo` (existing)
- `SplitScreenGameplay` (new)
- `Audiogram` (new)
- `RedditStory` (future)
- `ScreenRecording` (future)

Templates reference compositions by `compositionId`, keeping new formats additive.

### RenderProps extension

Extend `RenderProps` and `RenderPropsSchema`:

- `template?: { id: string; source: string; version?: string }`
- `templateParams?: Record<string, unknown>`
- `templateAssets?: ResolvedAssets` (normalized asset paths under a safety policy)

This keeps the render composition interface stable while enabling new formats.

### Assets safety policy

Treat template assets as data inputs and enforce guardrails:

- Disallow absolute paths inside templates by default (optional escape hatch)
- Resolve relative paths relative to the template directory
- Maintain an allowlist of asset types (video/image/font/audio)
- Prefer user-provided gameplay libraries (copyright compliance)

---

## CLI UX (Recommended)

### Selection flags

- `cm render --template <id|path>`
- `cm generate --template <id|path>` (next milestone)

### Generic overrides (`--set`)

Introduce a consistent override mechanism:

- `--set render.fps=60`
- `--set captions.layout.maxGapMs=1200`
- `--set template.params.splitScreenRatio=0.6`

This avoids exploding the CLI surface with one-off flags for every template param.

### Template management commands

- `cm templates list`
- `cm templates show <id>`
- `cm templates validate <path>`
- `cm templates install <zip|dir>`
- `cm templates uninstall <id>`

---

## Implementation Milestones (Recommended Order)

### Milestone 0 (done): Render templates MVP

- `cm render --template`
- `compositionId` support in renderer
- Unit + integration tests

### Milestone 1 (done): `cm generate --template`

- Add `--template` to `cm generate`
- Resolve template at the start of generate and pass into pipeline
- Include template info in `--json` envelope outputs

### Milestone 2: Template snapshot + reproducibility

- Write `template.resolved.json` artifact containing:
  - template id/source/path
  - a fully merged snapshot of defaults applied
  - a digest of template.json + bundled asset manifests
- Add `--keep-artifacts` behavior for template snapshot

### Milestone 3: Typed `params/assets` in RenderProps

- Extend render schema and pass through to Remotion
- Implement path resolution + validation for common asset slots

### Milestone 4: New built-in compositions

- `SplitScreenGameplay`:
  - uses `templateParams.splitScreenRatio`
  - chooses background from `templateAssets.gameplayLibrary` (or visuals stage output)
  - safe zones adjusted for captions
- `Audiogram`:
  - waveform + cover + captions

### Milestone 5: Template-driven pipeline defaults (optional v1.5+)

- Allow templates to set defaults for earlier stages:
  - visuals policy: stock vs gameplay vs user-footage
  - pacing options that influence visuals chunking and captions
- Keep stage schemas strict and versioned.

### Milestone 6: Installable template packs

- Zip install/uninstall commands
- Template pack manifest + validation
- Optional preview assets

---

## Risks & Mitigations

- **Complexity explosion:** too many knobs.
  - Mitigation: typed params per composition; prefer `--set` for power users; keep defaults sane.
- **Compatibility drift:** templates authored against old versions.
  - Mitigation: `schemaVersion`, `minCmVersion`, and migrations.
- **Security / trust:** templates referencing arbitrary files.
  - Mitigation: strict path policies; no code execution; explicit opt-in for trusted mode.
- **Support burden:** users share broken templates.
  - Mitigation: `cm templates validate` with actionable fix lines; add sample templates with tests.

---

## Success Criteria

- A user can switch between at least 2 distinct video formats with `--template`.
- Template selection is visible in `--json` outputs and artifacts for debugging.
- Adding a new built-in composition is a small, well-tested change.

---

## Related

- `docs/architecture/adr-003-data-first-video-templates-20260107.md`
- `docs/features/feature-video-templates-20260107.md`
- `docs/reference/video-templates-reference-20260107.md`
- `docs/architecture/TDD-TEST-PLAN-VIDEO-TEMPLATES-20260107.md`
