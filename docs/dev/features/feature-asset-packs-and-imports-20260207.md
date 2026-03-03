# Feature: Asset Packs and Imports (Hooks, Gameplay, SFX, Music, Overlays, Fonts)

**Date:** 2026-02-07  
**Status:** Draft  
**Owners:** content-machine core

---

## Overview

Users need a simple, predictable way to bring assets into the system:

- hooks (intro clips)
- gameplay libraries (for split-screen)
- SFX packs and music beds
- overlays and fonts (branding/template assets)

The repo already has command surfaces for hooks, templates, workflows, and whisper assets, but the
installation and directory conventions are not unified.

This feature standardizes asset directories and introduces a single pack install mechanism that
works for all supported asset types.

## User Value

- One installation story across asset types.
- Fewer where-do-I-put-this questions.
- Easier sharing of internal packs across a team.

## Goals

- A documented `~/.cm/assets/` layout with stable subfolders.
- `cm assets` (or `cm packs`) can install/list/validate packs.
- Packs are safe: no absolute paths, no path traversal, no code execution.

## Non-goals

- Bundling copyrighted media by default.
- Auto-downloading licensing-sensitive music/SFX without explicit opt-in.

## UX / CLI

### Commands (proposal)

- `cm packs install <zipOrDir> [--force]`
- `cm packs list`
- `cm packs validate <zipOrDir>`

Or, if we prefer fewer top-level nouns:

- `cm assets install-pack <zipOrDir>`
- `cm assets list-packs`

## Data Contracts

### Pack layout (v1)

Zip contains a single root directory with:

- `pack.json` (manifest)
- `assets/` (payload)

Manifest includes:

- `id`, `name`, `schemaVersion`
- `type`: `hooks|sfx|music|gameplay|overlays|fonts|templates|brands|workflow`
- optional `requires` (ffmpeg, whisper, etc.)

## Architecture

- Add `src/core/packs/*`:
  - pack schema
  - safe unzip/extract
  - install planner (destination paths per pack type)
- Use the same security constraints as template/workflow installers:
  - reject absolute paths
  - reject `..` traversal
  - atomic writes

## Testing

### Unit

- Path traversal rejection.
- Manifest validation.
- Deterministic destination resolution.

### Integration

- Install a pack, then list it and use it in `cm render`/`cm hooks`.

### V&V

- Manual: validate that a pack install does not overwrite unrelated folders without `--force`.

## Rollout

- Start with one pack type (hooks) and expand.
- Keep existing commands working; pack install is additive.

## Related

- Hooks: `docs/reference/cm-hooks-reference-20260111.md`
- Templates install: `src/render/templates/installer.ts`
- Workflows install: `src/workflows/installer.ts`
- On-demand assets: `docs/dev/features/feature-on-demand-assets-20260111.md`
