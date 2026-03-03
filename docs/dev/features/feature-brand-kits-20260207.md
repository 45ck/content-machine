# Feature: Brand Kits (House Style as Data)

**Date:** 2026-02-07  
**Status:** Draft  
**Owners:** content-machine core

---

## Overview

Templates define a format, but most real adoption requires house style:
fonts, colors, watermark/logo, safe zones, intro/outro defaults, and caption styling.

This feature introduces brand kits as a data contract that can be layered into render defaults
and referenced by templates and workflows.

## User Value

- Teams can enforce brand consistency across many videos and formats.
- Switching brands is a config change, not a template fork.
- Marketing workflows become repeatable and auditable.

## Goals

- Support `--brand <idOrPath>` in `cm generate` and `cm render`.
- Allow templates/workflows to specify a default brand.
- Make branding portable across machines (relative paths, pack installs).

## Non-goals

- A full design system or GUI editor (initially CLI + JSON/TOML).
- Remote brand registries.

## UX / CLI

### Commands

- `cm brands list|show|validate|install`

### Options

- `cm generate ... --brand <idOrPath>`
- `cm render ... --brand <idOrPath>`

## Data Contracts

### `brand.json` (v1 draft)

- `schemaVersion`
- `id`, `name`, optional `description`
- `palette`: named colors
- `typography`: body/display fonts and weights
- `render` defaults: watermark/logo, safe zone platform, caption preset/config overrides

Locations:

- built-in brands (optional)
- project brands: `./.cm/brands/<id>/brand.json`
- user brands: `~/.cm/brands/<id>/brand.json`

## Architecture

- Add `src/render/brands/*`:
  - schema
  - resolver (id or path)
  - registry/list/install (mirrors templates/workflows)
- Extend config merging order:
  - CLI flags
  - template defaults
  - brand defaults
  - workflow defaults
  - config defaults

Rationale: brand is style, workflow is pipeline, template is composition + style preset.
Exact precedence is a decision and should be explicitly tested.

## Testing

### Unit

- Schema validation and path resolution (relative + tilde).
- Precedence tests: brand vs template vs CLI flags.

### Integration

- `cm render --brand <path> --json` includes resolved brand source.

### V&V

- Render golden sample videos that demonstrate watermark, fonts, and safe zones.

## Rollout

- Start with minimal fields (fonts/palette/watermark/caption overrides).
- Add advanced motion branding later (intro/outro compositions).

## Related

- Templates: `docs/dev/features/feature-video-templates-20260107.md`
- Configuration: `docs/dev/architecture/configuration/README.md`
- Safe zones: `src/render/tokens/safe-zone.ts`
