# Configuration System PRD (v2) - 20260207

## Problem

content-machine already has multiple "configuration surfaces":

- CLI flags (large, powerful, but hard to discover and hard to reproduce)
- Project config file (`.content-machine.toml`, `content-machine.toml`, `.cmrc.json`)
- Video templates (`cm templates ...`) for render defaults
- Workflows (`cm workflows ...`) for pipeline orchestration defaults

But the system is not yet "fully configurable" in a cohesive way:

- Many tunables exist only as CLI flags (or only in code), not in config files
- Precedence is not fully documented or introspectable
- Sharing "a complete look" (captions + audio mix + templates + prompts) is still fragmented
- It's hard to freeze and replay exactly what produced a given video (for experiments and regressions)

## Goal (North Star)

Make content-machine configuration:

- Fully configurable across script/audio/visuals/render/validation/evals
- Easy to override (CLI), easy to persist (files), easy to share (packs)
- Deterministic and reproducible (you can re-run the same settings later)
- Maintainable: one canonical schema, low duplication, testable merge logic

## Primary Users

- **Developer-operator (local):** runs `cm generate` repeatedly, tweaks style/pacing/animation/audio mix, uses Experiment Lab to A/B and iterate.
- **Team (shared presets):** wants "house style" (brand kit) and reusable templates/workflows/presets across multiple repos/projects.

## Non-Goals (for v2)

- Multi-user auth, accounts, remote server hosting
- A "no-code" consumer UI. (A local config UI can come later; v2 should focus on a great data model and CLI ergonomics.)
- Arbitrary untrusted code execution from config (keep data-only by default)

## Requirements

### R1. Full Coverage

Every tunable in the pipeline must have a stable "home":

- A schema path (canonical config field)
- Optional CLI override (when practical)
- Documented default and validation constraints

### R2. Clear Precedence

Config precedence must be deterministic and explainable:

1. Built-in defaults (hard-coded)
2. Installed "packs" defaults (shareable)
3. User-level config (global)
4. Project-level config (repo/project)
5. Workflow defaults (selected workflow)
6. Template defaults (selected template)
7. Recipe/run spec (explicit file for a run)
8. CLI flags (last-mile)

If we don't implement all layers immediately, the order above is still the design target.

### R3. Reproducibility

Every `cm generate` (and `cm render`) can optionally emit a **RunSpec** artifact that contains:

- Fully resolved config (post-merge)
- Versions and sources (config file paths, template/workflow ids, pack ids)
- Input artifact fingerprints (hashes of script/audio/visuals JSON and key binaries)
- Repo version info (git SHA if available)

This enables: perfect re-runs, A/B comparisons, regression tests, and audit trails.

### R4. Shareability (Packs)

Support distributable "packs" that can include:

- Video templates (already supported)
- Workflows (already supported)
- Caption style presets (data-backed, optional)
- Audio mix presets, SFX packs, music packs (data + assets)
- Prompt templates / archetype packs (data-only templates + variables)

Packs should be installable locally (zip or directory), and discoverable.

### R5. Safety

The default configuration format is **data-only** and safe to load.

- Workflow `exec` already exists; keep it explicit and opt-in (`--workflow-allow-exec`).
- A future "JS/TS config" mode can exist, but must be clearly labeled as code execution.

### R6. Great UX (Developer)

- `cm config show` displays effective config (and optionally where each value came from).
- `cm config validate` gives actionable errors.
- `cm config diff A B` helps experiment iteration.
- Config files use a human-friendly format (TOML preferred) with real parser support.

### R7. Portable Paths

Config must be portable across machines and repos:

- Support `~` expansion for user paths
- Resolve relative paths relative to the config file directory (not always `process.cwd()`)
- Preserve raw strings for display and RunSpec provenance, but also store the resolved absolute path used at runtime

### R8. Backwards Compatibility + Migration

- Existing config files must continue to work.
- Schema changes must be versioned (`schema_version`) and either:
  - supported directly, or
  - migrated with an explicit `cm config migrate` step.

## Success Metrics

- Users can create a "house style" without editing TypeScript.
- A/B experiments can reliably attribute changes to configuration deltas.
- Adding a new tunable requires editing schema in one place and updating tests, not duplicating logic across multiple commands.

## Acceptance Criteria (v2)

1. A single project config file can set defaults for:
   - template/workflow selection
   - caption preset + captionConfig overrides
   - audio mix preset + levels
   - sync strategy defaults
2. Users can install and reference packs for templates/workflows (already), and at least one new pack type (caption presets or audio mix presets).
3. `cm generate` can emit a RunSpec capturing resolved configuration and provenance.
4. Precedence is documented and covered by unit tests.

## Roadmap (Beyond v2)

Once v2 is shipped and stable, "fully configurable" expands into:

- External prompt templates (pack-based) replacing hard-coded prompt strings
- Archetype packs (data-defined archetype defaults across script/audio/visuals/render)
- Provider routing per stage (e.g., different LLM model for `script` vs `visuals`)
- Validation + scoring configuration profiles as first-class shareable entities
- Lab integration that shows a config diff alongside A/B playback (without showing heuristic scores by default)
