# Feature: Template Authoring and Preview

**Date:** 2026-02-07  
**Status:** Draft  
**Owners:** content-machine core

---

## Overview

Templates are the primary way to scale formats without changing pipeline code. The repo already
supports:

- `cm render --template <idOrPath>`
- `cm templates list|show|validate|install`

This feature makes template development faster and safer by adding scaffolding, preview, and
packaging ergonomics.

## User Value

- A non-dev can install a template pack and use it immediately.
- A dev can iterate on a new format without reverse-engineering required fields.
- Fewer template bugs via schema validation + preview tooling.

## Goals

- `cm templates new` creates a correct skeleton directory.
- `cm templates preview` renders a short, deterministic sample for quick iteration.
- `cm templates pack` creates a shareable zip pack.

## Non-goals

- Executing arbitrary JS in templates.
- A hosted marketplace.

## UX / CLI

### Commands

- `cm templates new <id> [--from <builtinId>] [--dir <path>]`
- `cm templates preview <idOrPath> [--output <path>] [--duration <seconds>] [--open]`
- `cm templates pack <dir> [--output <zipPath>]`

### Options

- `--from`: clone built-in template defaults to start faster.
- `preview --open`: open the resulting MP4 in the system default player (best-effort).

## Data Contracts

- Template packs are zip files containing a single template directory with `template.json`.
- Preview uses a deterministic preview script and preview timestamps bundled with the app or generated on the fly.

## Architecture

- Keep template schema in one place (`src/render/templates/schema.ts`).
- Add a preview harness that can generate:
  - a minimal `visuals.json` (fallback colors)
  - minimal `timestamps.json` and word list
  - optional gameplay slot stubs for split-screen templates

### Failure modes / recovery

- Preview must fail fast if required slots are missing (example: gameplay required).
- Every error includes a Fix suggestion.

## Testing

### Unit

- `templates new` produces valid `template.json` and directory layout.
- `templates pack` rejects invalid zips and enforces expected layout.

### Integration

- `templates preview` renders an MP4 for each built-in template on CI (short duration).

### V&V

- Layer 4: visually inspect preview outputs for caption placement and safe zone compliance.

## Rollout

- Additive commands only.
- Keep preview deterministic to avoid flaky tests.

## Related

- Existing templates feature: `docs/dev/features/feature-video-templates-20260107.md`
- Reference: `docs/reference/video-templates-reference-20260107.md`
- Existing commands: `src/cli/commands/templates.ts`
