# Feature: Curated Workflows (Pipelines for Common Use Cases)

**Date:** 2026-02-07  
**Status:** Draft  
**Owners:** content-machine core

---

## Overview

Workflows let teams create repeatable pipelines. The repo already supports workflow resolution and
installation (`cm workflows ...`). What is missing is a curated set of workflows that map to the
most common short-form production workflows.

This feature ships a small set of built-in workflows and a consistent authoring story so new
workflows are easy to create and share.

## User Value

- New users can pick a workflow and get predictable results.
- Teams can standardize production with fewer flags and fewer mistakes.
- More use cases are supported without core code changes.

## Goals

- Ship at least 5 built-in workflows with docs and example commands.
- Add `cm workflows new` scaffolding to reduce authoring friction.
- Ensure workflows remain data-first and safe by default.

## Non-goals

- Running arbitrary code by default (exec hooks require explicit allow flags).

## UX / CLI

### Commands

- `cm workflows new <id> [--from <builtinId>] [--dir <path>]`

### Built-in workflow targets (initial)

- `news-listicle` (research + list badges + chunk captions)
- `brainrot-gameplay` (split-screen gameplay template + hook library)
- `podcast-audiogram` (cover + waveform + captions)
- `product-demo` (screen recording + callouts + captions)
- `ugc-testimonial` (BYO clips + branding)

## Data Contracts

- `workflow.json` schema remains authoritative (`src/workflows/schema.ts`).
- Built-in workflow directories should include:
  - `workflow.json`
  - `README.md` (how to run)
  - optional local assets or references to packs

## Architecture

- Add a built-in workflows directory in the app package (similar to built-in templates).
- Keep the resolver order:
  - explicit path
  - built-in
  - project
  - user

## Testing

### Unit

- Workflow scaffolder outputs valid `workflow.json`.

### Integration

- `cm workflows list` includes the built-ins.
- `cm generate --workflow <builtin>` works in mock mode.

### V&V

- Render golden samples for each built-in workflow monthly.

## Rollout

- Start with mock-friendly workflows that do not require external keys.
- Mark external-key workflows clearly in help output.

## Related

- Workflows feature: `docs/dev/features/feature-custom-workflows-20260110.md`
- Workflows reference: `docs/reference/cm-workflows-reference-20260110.md`
