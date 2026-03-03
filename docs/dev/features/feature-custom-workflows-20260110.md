# Feature: Custom Workflows and Asset Imports

**Date:** 2026-01-10  
**Status:** Draft  
**Owners:** content-machine core

---

## Overview

Add first-class CLI support for custom marketing workflows by letting users:

- Provide their own audio and video assets.
- Import those assets into standard pipeline artifacts.
- Optionally stitch these choices into repeatable workflow definitions.

The core principle is artifact-first modularity. Every stage still reads and writes the same
validated JSON artifacts, so external workflows can integrate without forking the CLI.

## User Value

- Use custom footage or a proprietary generator while keeping cm captions and render styles.
- Plug cm into existing marketing automation without reworking the pipeline.
- Keep stable inputs and outputs for scripting, CI, and integrations.

## Goals

- Add CLI flags to accept prebuilt artifacts in `cm generate`.
- Provide importers for user footage and existing audio.
- Keep the default pipeline behavior unchanged.
- Validate all externally supplied artifacts with existing Zod schemas.

## Non-goals

- Executing untrusted code by default.
- Replacing the four-stage pipeline with a new engine.
- Shipping a workflow marketplace or remote registry.

## UX / CLI

### Commands

- `cm generate --script <path> --audio <path> --timestamps <path> --visuals <path>`
- `cm import visuals ...`
- `cm timestamps --audio <path> --output timestamps.json`
- `cm workflows list|show|validate|install`

### Options

#### `cm generate`

- `--script <path>`: Use an existing `script.json` and skip script generation.
- `--audio <path>`: Use an existing audio file and skip TTS.
- `--timestamps <path>`: Use existing timestamps (required when `--audio` is used).
- `--visuals <path>`: Use an existing `visuals.json` and skip visuals matching.
- `--workflow <id|path>`: Load a workflow definition (optional).
- `--workflow-allow-exec`: Allow external commands defined in a workflow.

#### `cm import visuals`

Create `visuals.json` from local footage.

- `--timestamps <path>`: Use scene durations from timestamps.
- `--clips <dir|glob>`: Folder or glob of video clips.
- `--clip <path>`: Single clip (loop or trim to fit total duration).
- `--mode <sequence|loop|map>`: Mapping strategy.
- `--map <path>`: JSON mapping of sceneId -> clip path.
- `--output <path>`: Output visuals file (default `visuals.json`).

#### `cm timestamps`

Generate timestamps from an existing audio file.

- `--audio <path>`: Input audio file.
- `--script <path>`: Optional script for reconciliation.
- `--reconcile`: Align words to script punctuation/casing.
- `--whisper-model <model>`: tiny|base|small|medium|large.
- `--output <path>`: Output timestamps file (default `timestamps.json`).

## Data Contracts

### Workflow definition (workflow.json)

Used to persist repeatable configurations. The workflow file is data-only and does not execute
code unless `--workflow-allow-exec` is provided.

```json
{
  "schemaVersion": "1.0.0",
  "id": "acme-custom-assets",
  "name": "Acme Custom Assets",
  "description": "Use local footage and external audio",
  "defaults": {
    "template": "tiktok-captions",
    "orientation": "portrait"
  },
  "inputs": {
    "audio": "assets/audio/voiceover.wav",
    "timestamps": "assets/audio/timestamps.json",
    "visuals": "assets/visuals/visuals.json"
  },
  "stages": {
    "visuals": { "mode": "import" },
    "render": { "mode": "builtin" }
  },
  "hooks": {
    "pre": [],
    "post": []
  }
}
```

Notes:

- `defaults` keys can use CLI attribute names (camelCase) or flag names (kebab-case).
- `stages.<stage>.exec` implies an external stage when `mode` is omitted.
- External stages default to artifacts in the output directory (e.g. `script.json`, `audio.wav`).
- Render-stage overrides are not supported in `cm generate` yet (use `cm render` or `hooks.post`).
- `workflow-allow-exec` must be set explicitly on the CLI.

### Resolution order

- `./.cm/workflows/<id>/workflow.json`
- `~/.cm/workflows/<id>/workflow.json`
- Explicit path (file or directory)
- `inputs` paths are resolved relative to the workflow.json location.

### Local footage in visuals.json

Use `source: "user-footage"` and a local `assetPath`. The render stage will copy local assets
into the Remotion bundle before rendering.

## Architecture

### Modules

- `src/workflows/schema.ts`: WorkflowDefinition Zod schema.
- `src/workflows/resolve.ts`: Resolve workflow by id or path.
- `src/workflows/runner.ts`: Merge workflow defaults and route stages.
- `src/importers/visuals.ts`: Build visuals.json from local footage.
- `src/importers/timestamps.ts`: ASR-only timestamps from audio.

### Pipeline behavior

- `cm generate` loads workflow (optional), then merges:
  - CLI flags (highest priority)
  - Workflow defaults
  - Config defaults
- For each stage, resolve input source:
  - If `--script/--audio/--timestamps/--visuals` provided, validate and skip stage.
  - If workflow declares `mode: external`, run the command only when `--workflow-allow-exec`.
  - Otherwise run the builtin stage.
  - External stages default to artifacts in the output directory unless overridden via `inputs`.

### Asset bundling

- Extend asset bundler to copy local `user-footage` assets into the Remotion bundle.
- Keep remote asset download behavior unchanged.

### Failure modes and recovery

- Missing external artifacts -> SchemaError with fix hints.
- External command returns non-zero -> PipelineError with command context.
- Workflow requires exec but `--workflow-allow-exec` is absent -> fail fast with fix line.

### Alternatives considered

1. In-process code execution system (rejected)
   - High security risk, dependency conflicts, hard to sandbox.
2. External orchestration only (status quo)
   - Works for power users but not discoverable or systemized.
3. Workflow DSL only (rejected for MVP)
   - Adds complexity without solving asset import UX.
4. Importers only (insufficient)
   - Does not cover repeatable multi-step marketing workflows.

Chosen approach combines importers, artifact inputs, and optional workflow definitions to
maximize modularity while staying CLI-first and safe by default.

## Testing

### Unit

- Workflow schema validation and merge rules.
- Workflow input resolution (relative paths + default artifacts).
- Visuals importer duration mapping with ffprobe.
- Timestamps importer with whisper and reconciliation.

### Integration

- `cm generate` with `--audio/--timestamps/--visuals` skips stages and renders.
- `cm import visuals` -> `cm render` produces a valid video.
- Workflow external stage blocked without `--workflow-allow-exec`.

### V&V

- Layer 1: Zod validation of all imported artifacts.
- Layer 2: Audio duration and scene coverage checks.
- Layer 4: Manual review of custom footage + captions.

## Rollout

- Default pipeline unchanged.
- Importers and workflow usage are opt-in.
- Add references to CLI help and docs.

## Related

- ADRs: [ADR-002 Visual Provider System](../architecture/ADR-002-VISUAL-PROVIDER-SYSTEM-20260107.md)
- Guides: [Render Templates Guide](../guides/guide-video-templates-20260107.md)
- References: [cm render reference](../reference/cm-render-reference-20260106.md)
- Research: [vidosy JSON config pattern](../research/12-vidosy-20260102.md)
