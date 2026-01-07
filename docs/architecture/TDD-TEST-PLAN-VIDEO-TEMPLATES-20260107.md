# TDD: Test Plan — Video Templates (20260107)

**Date:** 2026-01-07  
**Status:** Ready  
**Owners:** content-machine core

---

## Purpose

Define the TDD plan for expanding the **data-first video template system** into a platform-grade capability while preserving backwards compatibility and CLI contracts.

This plan follows:

- 🔴 **RED**: write failing tests that define behavior
- 🟢 **GREEN**: minimal implementation to pass
- 🔵 **REFACTOR**: clean up while staying green

---

## Scope

In scope:

- Template resolution + validation (id/path, built-in/project/user)
- Merge/precedence rules (CLI overrides always win)
- Template snapshot + reproducibility artifacts
- RenderProps propagation of template metadata/params/assets
- New built-in compositions (split-screen gameplay, audiogram)
- Template management commands (validate/install/list)

Out of scope:

- Executing template-provided code (“plugin templates”) in default mode

---

## Invariants (Non-Negotiable)

### Backwards compatibility

- If `--template` is not provided, behavior must match current releases.
- Existing CLI flags must retain meaning and precedence.
- Existing JSON envelopes must remain valid; only additive fields are allowed.

### CLI stdout/stderr contract

- Human mode: stdout prints only the primary artifact path.
- `--json`: stdout prints exactly one JSON object, no other output.

---

## Test Matrix (by Layer)

### Unit tests (fast, deterministic)

Target modules:

- `src/render/templates/*`
- `src/cli/commands/render.ts` merge logic
- Future: `src/cli/commands/generate.ts` + pipeline merge logic
- Future: asset path resolution + safety policy

Examples:

- Schema rejects missing `id/name/compositionId`
- Resolver loads id/path/dir correctly
- Merge function deep-merges caption config correctly

### Integration tests (CLI-level)

Target:

- `tests/integration/cli/*`
- `tests/integration/render/*` (when compositions expand)

Examples:

- `cm render --template <path> --mock --json` includes resolved template id
- Template defaults apply only when CLI flag source is `default`
- Explicit flags override template defaults

### E2E / V&V (human + probes)

Target:

- Sample renders for 10s videos for each template
- Visual inspection checklist (safe zones, readability, no black frames, correct composition selection)

---

## Milestone-by-Milestone TDD Plan

### Milestone 1: `cm generate --template`

#### 🔴 RED — tests

1. `cm generate --template <path> --mock --json` includes:
   - `args.template` (provided value)
   - `args.resolvedTemplateId`
   - outputs include width/height/fps derived from template defaults if not overridden
2. `cm generate --template <path> --orientation portrait` does not get overridden by template orientation.
3. `cm generate` without `--template` remains unchanged (regression test snapshot on JSON envelope keys).

#### 🟢 GREEN — minimal implementation

- Add `--template` option to generate command
- Resolve template early and thread into pipeline options
- Apply template defaults only when CLI values are defaults

#### 🔵 REFACTOR

- Extract shared “apply template defaults” helper used by both render and generate

---

### Milestone 2: Template snapshot + reproducibility

#### 🔴 RED — tests

1. When `--keep-artifacts`, `cm generate` writes `template.resolved.json` next to artifacts.
2. `template.resolved.json` contains:
   - template id/source/path
   - resolved defaults actually applied
   - digest string (non-empty)
3. When `--json`, envelope includes `outputs.templateSnapshotPath` (or `null` if not written).

#### 🟢 GREEN

- Add artifact writer and digest computation

#### 🔵 REFACTOR

- Make snapshot generation pure/testable (no direct fs in core merge logic)

---

### Milestone 3: Typed `params/assets` propagation

#### 🔴 RED — tests

1. `RenderPropsSchema` accepts `template`, `templateParams`, and `templateAssets`.
2. `cm render --template <path> --mock --json` reports the template id and the selected `compositionId`.
3. Asset resolver:
   - resolves relative paths to the template dir
   - rejects absolute paths by default (exit 2 + fix guidance)

#### 🟢 GREEN

- Extend schema + pass-through to Remotion input props
- Implement a minimal asset resolver for a small slot set (video/image/font/audio)

#### 🔵 REFACTOR

- Centralize asset policy (single module) + add clear error types

---

### Milestone 4: New built-in compositions

#### 🔴 RED — tests

1. Composition registry contains `SplitScreenGameplay` and `Audiogram`.
2. `cm render --template <split-screen-template> --mock --json` selects `SplitScreenGameplay`.
3. RenderProps contract tests:
   - split screen respects `templateParams.splitScreenRatio` bounds (reject invalid values)

#### 🟢 GREEN

- Add minimal compositions with placeholder layouts and validate render selection

#### 🔵 REFACTOR

- Extract shared layout primitives (safe zones, background handling, caption placement)

---

### Milestone 5: Template-driven pipeline defaults (optional)

#### 🔴 RED — tests

1. Template defaults for visuals policy are applied when CLI values are defaults.
2. Template defaults never override explicit CLI flags.
3. Regression: existing archetype-only flows are unchanged without templates.

#### 🟢 GREEN

- Thread template defaults into pipeline stage options

#### 🔵 REFACTOR

- Create a single merge function that produces a fully “resolved pipeline config” object

---

### Milestone 6: Template packs + management commands

#### 🔴 RED — tests

1. `cm templates install <zip>` installs into `~/.cm/templates/<id>/`.
2. `cm templates list --json` emits the installed + built-in templates.
3. `cm templates validate <path>` returns exit 0 on valid, exit 2 on invalid with fix guidance.

#### 🟢 GREEN

- Implement minimal install/list/validate with safe file operations

#### 🔵 REFACTOR

- Add pack manifest schema + richer errors

---

## Regression Suite (Must Always Run)

- `tests/integration/cli/stdout-contract.test.ts`
- `tests/integration/cli/json-envelope.test.ts`
- `tests/integration/cli/stdout-contract-pipeline.test.ts`
- `tests/integration/cli/render-template.test.ts`

---

## Verification Checklist (V&V)

- [ ] `cm render --template tiktok-captions` works with no other flags
- [ ] Explicit flags override template defaults
- [ ] `--json` output remains pure JSON
- [ ] At least 2 templates render visually distinct formats
- [ ] Template snapshot is written and includes digest
- [ ] Invalid templates fail with actionable fix guidance

---

## Related

- `docs/architecture/IMPL-VIDEO-TEMPLATES-20260107.md`
- `docs/architecture/adr-003-data-first-video-templates-20260107.md`
- `docs/features/feature-video-templates-20260107.md`
