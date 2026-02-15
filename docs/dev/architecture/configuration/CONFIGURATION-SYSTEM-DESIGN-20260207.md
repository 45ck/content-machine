# Configuration System Design (v2) - 20260207

## TL;DR

Introduce a cohesive config model that:

- Loads config from multiple sources with deterministic precedence
- Supports real TOML parsing (nested sections, arrays, multiple files)
- Produces a **ResolvedConfig** for execution and an optional **RunSpec** artifact for reproducibility
- Supports shareable **packs** (data-only) for templates/workflows/presets/assets/prompts

## Current State (What Exists)

- Project config loader: `src/core/config.ts`
  - Reads `.content-machine.toml`, `content-machine.toml`, `.cmrc.json` (current directory only)
  - Uses a simplified TOML parser (flat sections only; no arrays; no nested sections)
- Templates: `cm templates ...` (builtins + `./.cm/templates/<id>` + `~/.cm/templates/<id>`)
- Workflows: `cm workflows ...` (builtins + `./.cm/workflows/<id>` + `~/.cm/workflows/<id>`)
- Captions: fully configurable schema at render time: `src/render/captions/config.ts`
- Many tunables exist only as CLI options (especially in `cm generate` and `cm render`)

## Target State (What We Want)

### 1. A Single Canonical Model

- `ProjectConfig` (user intent)
- `ResolvedConfig` (fully merged, validated, with defaults)
- `RunSpec` (frozen snapshot: inputs + resolved config + provenance)

### 2. Deterministic Precedence

Order (low -> high priority):

1. Built-in defaults (Zod defaults)
2. Pack defaults (installed packs)
3. User config (`~/.cm/config.toml` or `~/.cmrc.json`)
4. Project config (repo/project)
5. Workflow defaults (selected workflow)
6. Template defaults (selected template)
7. Recipe spec (`--recipe`, optional)
8. CLI flags

### 3. Explainability

Implement an "explain" view:

- `cm config show` (resolved config)
- `cm config explain captions.wordAnimationIntensity` (value + source)

This requires source tracking during merge (at least for top-level fields at first).

## File Formats

### TOML (primary)

Use a real TOML parser (library) so we can support:

- nested sections: `[captions.layout]`, `[audio.mix]`
- arrays: `fonts = [{ family = "...", src = "..." }]`
- `schemaVersion` fields

Implementation notes:

- Prefer an actively maintained parser with good ESM compatibility.
- Keep error reporting actionable (surface file path and, if available, line/column).

### JSON (secondary)

Retain `.cmrc.json` support for tooling and advanced structures.

### Env overrides (optional, power user)

Support environment overrides for CI and quick tests:

- `CM_LLM_PROVIDER=openai`
- `CM_CAPTIONS__WORD_ANIMATION_INTENSITY=0.9`

Rule: env overrides win only over file-based sources, never over explicit CLI flags.

## Config Discovery

To make config predictable across monorepos and nested project directories:

- Search order for _project config_ should walk up from `process.cwd()` to the filesystem root, stopping at the first matching config filename (or at a repo root marker if present).
- Add explicit `--config <path>` support to bypass discovery and load a specific config file.
- Keep `.content-machine.toml` as the primary project file name, but continue to accept the legacy alternatives.

## Path Resolution

When config contains paths (fonts, hooks dir, assets, templates/workflows by path):

- Expand `~` to home directory.
- Resolve relative paths against the directory containing the config file that introduced the value.
- Store both:
  - the original configured string (for display + RunSpec provenance)
  - the resolved absolute path (for execution)

This avoids "works on my machine" failures and enables portable packs.

## Schema Versioning + Migration

Add explicit versioning:

- `schema_version` at the root of config files
- `schemaVersion` fields already exist in templates/workflows; align naming strategy or document the difference

Migration strategy:

- Prefer backwards-compatible additive changes where possible.
- If a breaking change is required, add `cm config migrate` that:
  - reads old config
  - writes new config
  - emits a diff summary
  - never overwrites without explicit `--write`/`--in-place`

## Extends (Optional, High-Leverage)

Support `extends = [...]` at the root of config files:

- Allows teams to share a base "house style" file and override in per-project configs.
- Precedence: extended configs load first; the current file overrides.
- Cycles must be detected and rejected with a clear error.

## Schema Design

### Keep config small; reference richer systems

Prefer referencing shareable entities instead of embedding everything:

- `render.template` references a template id/path
- `render.captionPreset` references a preset id
- `render.captionConfig` is a deep-partial override (validated)
- `workflow` references workflow id/path

### Example v2 config (TOML)

```toml
schema_version = "2.0.0"

[defaults]
archetype = "listicle"
orientation = "portrait"
voice = "af_heart"

[llm]
provider = "openai"
model = "gpt-4o"
temperature = 0.6

[sync]
strategy = "audio-first"
require_whisper = true
asr_model = "base"
reconcile_to_script = true

[render]
template = "tiktok-captions"

[captions]
preset = "capcut"
mode = "chunk"

[captions.word_animation]
type = "pop"
ms = 120
intensity = 0.9

[audio_mix]
preset = "viral"
lufs_target = -14
```

Notes:

- Nested keys should align with existing schema structures in code (e.g. `CaptionConfigSchema.deepPartial()`).
- Any CLI flag should map cleanly onto a config field path.

## Packs

### Pack goals

- Installable locally (directory or zip)
- Data-only by default
- Validated with Zod schemas
- Composable via precedence (packs provide defaults; project config overrides)

### Pack structure (proposed)

```
pack.json            # metadata (id, name, version, dependencies)
templates/<id>/template.json
workflows/<id>/workflow.json
captions/presets/<id>.json
audio/mix-presets/<id>.json
audio/sfx/<pack-id>/manifest.json + audio files
script/prompts/<archetype>.md
```

We already have installers/registries for templates/workflows; extend that pattern.

## RunSpec (Provenance Contract)

Write `run.json` (or `runs/<id>.json`) when requested:

- `schemaVersion`
- `generatedAt`
- `inputs` (topic, or paths to artifacts)
- `resolvedConfig`
- `sources` (config paths, workflow/template ids, pack ids)
- `fingerprints` (hashes of inputs/artifacts)

The Experiment Lab can then:

- Diff `resolvedConfig` between A/B
- Show "what changed" without exposing heuristic scores (avoid bias)

## Maintainability Principles

- One merge implementation shared across commands
- One schema per subsystem, imported (don't duplicate enum strings in multiple places)
- Avoid widening `any`: prefer `unknown` + Zod parse at boundaries
- Default to data-only; gate any execution explicitly

## Open Questions

- Do we standardize on `~/.cm/config.toml` or `~/.cmrc.json` for global config? (Both can work; pick one primary.)
- Do we allow `extends = [...]` in config files? (Very useful for teams; adds complexity.)
- How granular should "explain sources" be in v2 (whole section vs per-field)?
