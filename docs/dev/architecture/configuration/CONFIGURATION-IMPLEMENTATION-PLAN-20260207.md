# Configuration Implementation Plan (v2) - 20260207

This is the engineering plan to implement the v2 configuration system with maximum maintainability and minimum duplication.

## Phase 0: Baseline Tests (Before Refactor)

1. Add unit tests covering current config precedence behavior (even if limited)
2. Snapshot test `cm generate --dry-run --json` output for a small set of defaults (ensures we don't silently change CLI behavior)

## Phase 1: Real TOML Parsing + Nested Sections

Goal: unlock "fully configurable" configs without changing UX for existing users.

1. Replace simplified TOML parser in `src/core/config.ts` with a library parser
   - Pick a TOML parser with strong ESM support and good error messages
2. Ensure existing `.content-machine.toml` still parses
3. Add tests:
   - nested sections parse correctly
   - arrays parse correctly (fonts array, etc)
   - error messages are actionable (bad TOML gives file + line if possible)
4. Add config discovery tests:
   - when running in nested directories, config discovery finds the intended project config

## Phase 1.5: Path Resolution (Portable Configs)

1. Add `~` expansion and resolve relative paths relative to the config file directory
2. Add tests for:
   - fonts (fontFile / fonts[].src)
   - hooks dir
   - template/workflow path references

## Phase 2: Add User-Level Global Config

Goal: support a global `~/.cm/*` config that applies across repos.

1. Choose location:
   - `~/.cm/config.toml` (recommended) and/or `~/.cmrc.json` (legacy from design docs)
2. Implement loader that merges:
   - built-in defaults
   - user config
   - project config
3. Add `cm config show` and `cm config validate`
4. Add `cm config migrate` (stub at first) and reserve `schema_version`

## Phase 3: Expand Config Schema Coverage

Goal: config files can set defaults currently only settable via flags.

1. Add config fields for:
   - render defaults: `template`, `captionPreset`, `captionConfig`, `captionMode`
   - audio mix defaults: `audioMix` already exists, expand if needed
   - validation defaults (optional): `validate.profile`, `validate.cadence`, etc
2. Wire up `cm generate` and `cm render`:
   - apply config defaults via `applyDefaultOption` only when the user didn't explicitly set the flag
3. Tests:
   - config defaults apply
   - CLI overrides win
   - template defaults still apply at the right point in precedence order
   - workflow defaults still apply at the right point in precedence order

## Phase 4: Packs (First New Pack Type)

Goal: share configuration beyond templates/workflows.

Pick one pack type first:

- Caption preset pack (recommended: high impact, aligns with current focus on animations)
  - schema: `{ id, name, basePreset, overrides }`
  - install path: `~/.cm/captions/presets/<id>.json`
  - registry: list/show/validate/install commands mirroring templates/workflows

or

- Audio mix preset pack (lower UX value than captions, but still useful)

## Phase 5: RunSpec Artifact (Reproducibility)

1. Add `--emit-runspec <path>` (or `--runspec`) to `cm generate`
2. Write resolved config + provenance (template/workflow sources, config file paths)
3. Add tests:
   - run spec includes the resolved template id and workflow id
   - stable ordering / deterministic JSON output
   - includes config source paths and pack ids (when applicable)

## Phase 6: Config Explainability

1. Implement `cm config explain <path>`:
   - value
   - source label (builtin/user/project/template/workflow/cli)
2. Keep scope realistic: start with section-level source tracking, move to per-field later.

## Phase 7: Env Overrides (Optional, Power User)

1. Implement env override mapping:
   - support a stable naming convention (e.g. `CM_CAPTIONS__WORD_ANIMATION_INTENSITY`)
   - type parsing based on schema types
2. Tests:
   - env overrides beat file config
   - CLI beats env overrides

## QA Checklist (Every Phase)

- `npm test`
- `npm run -s typecheck` (or repo equivalent)
- `npm run -s lint` (if configured)
- Add/extend Vitest tests near the loader/merge logic
- Add at least one e2e test for "config affects generate defaults" using existing test harness patterns

## Principal Engineer Review Notes (Pre-mortem)

Common failure modes to avoid:

- Silent precedence changes (fix with tests and `cm generate --dry-run --json` snapshots)
- Schema drift between CLI options and config fields (fix by mapping explicitly and documenting)
- Over-expanding config surface without good defaults (ship with presets + safe, tested defaults)
- Allowing code execution via config by default (keep data-only; gate `exec` and any future JS config)
