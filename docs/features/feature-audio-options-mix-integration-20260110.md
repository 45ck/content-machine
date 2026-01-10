# Feature: Audio Options and Mix Integration

**Date:** 2026-01-10  
**Status:** Draft  
**Owners:** Core  

---

## Overview

Add optional background music, SFX, and ambience layers to content-machine while keeping the voiceover as the master clock. The audio stage produces a voice track plus a mix plan that the render stage consumes to place audio layers in sync with captions and visuals.

## User Value

- Create more engaging short-form videos without manual audio editing.
- Keep CLI stages composable with explicit artifacts and predictable defaults.
- Preserve caption timing accuracy by keeping voiceover timing authoritative.

## Goals

- Expose CLI and config options for music, SFX, ambience, and mix presets.
- Produce a deterministic mix plan aligned to `timestamps.json`.
- Keep total duration equal to voiceover by default (no extra tail).
- Integrate with `cm render` without changing `cm visuals` inputs.

## Non-goals

- AI music generation or licensing management.
- DAW-grade mixing features (automation curves, multiband EQ, etc).
- Extending the video duration beyond the voice track by default.

## UX / CLI

### Commands

- `cm audio --input script.json --output audio.wav --timestamps timestamps.json --audio-mix audio.mix.json`
- `cm generate "Topic" --music lofi-01 --sfx-pack pops --mix-preset viral`
- `cm render --input visuals.json --audio audio.wav --timestamps timestamps.json --audio-mix audio.mix.json --output video.mp4`

### Options

- `--audio-mix <path>`: output (cm audio) or input (cm render) for mix plan (default: `audio.mix.json`)
- `--music <path|preset>`: background music track or preset name
- `--music-volume <db>`: default `-18`
- `--music-duck <db>`: duck music under voice, default `-8`
- `--music-loop`: loop music to voice duration
- `--music-fade-in <ms>` / `--music-fade-out <ms>`: fades for music bed
- `--sfx <path>`: explicit SFX file (repeatable)
- `--sfx-pack <name>`: named pack for auto placement (hook/scene/list/cta)
- `--sfx-at <hook|scene|list-item|cta>`: auto placement strategy
- `--sfx-volume <db>`: default `-12`
- `--ambience <path|preset>`: ambience bed
- `--ambience-volume <db>`: default `-26`
- `--mix-preset <clean|punchy|cinematic|viral>`: selects default volumes and ducking
- `--lufs-target <db>`: normalize final loudness (default `-16`)
- `--no-music` / `--no-sfx` / `--no-ambience`: opt out of layers

## Data Contracts

- Inputs:
  - `script.json` (ScriptOutput)
  - `.content-machine.toml` audio config overrides
  - optional audio assets (paths or presets)
- Outputs:
  - `audio.wav` (voiceover)
  - `timestamps.json` (TimestampsOutput)
  - `audio.mix.json` (AudioMixOutput, new)
  - optional stems in `audio/stems/` (if enabled)
- Schema versioning / migrations:
  - New `AudioMixOutput` schema version `1.0.0` with explicit layer timing.
  - Backwards compatible: `timestamps.json` unchanged; `audio.mix.json` optional.

Example `audio.mix.json`:

```json
{
  "schemaVersion": "1.0.0",
  "voicePath": "audio.wav",
  "totalDuration": 32.4,
  "mixPreset": "clean",
  "lufsTarget": -16,
  "layers": [
    {
      "type": "music",
      "path": "assets/audio/music/lofi-01.mp3",
      "start": 0,
      "end": 32.4,
      "volumeDb": -18,
      "duckDb": -8,
      "fadeInMs": 400,
      "fadeOutMs": 600,
      "loop": true
    },
    {
      "type": "sfx",
      "path": "assets/audio/sfx/pop-03.wav",
      "start": 4.2,
      "duration": 0.4,
      "volumeDb": -12,
      "event": "list-item",
      "sceneId": "scene-2"
    },
    {
      "type": "ambience",
      "path": "assets/audio/ambience/roomtone.wav",
      "start": 0,
      "end": 32.4,
      "volumeDb": -26,
      "loop": true
    }
  ],
  "warnings": []
}
```

## Architecture

- Key modules:
  - `src/audio/mix/` for mix planning and schema validation.
  - `src/audio/assets/` for resolving preset names to local files.
  - `src/render/audio/` for mapping mix plan layers to Remotion audio tracks.
  - `src/cli/commands/audio.ts` and `src/cli/commands/render.ts` to expose options.
- Dependencies:
  - Local audio assets in `assets/audio/{music,sfx,ambience}`.
  - Remotion for final mix placement in `cm render`.
- Failure modes / recovery:
  - Missing asset: log warning, drop the layer, keep voiceover.
  - Loud BGM reduces ASR quality: default ducking and volume caps.
  - Overlapping SFX: enforce density caps and minimum spacing.
  - Mix plan exceeds voice duration: clamp to voice length by default.

## Testing

### Unit

- Mix plan schema validation and defaults.
- Asset resolver: preset name to file path and error handling.
- Placement rules: hook/scene/list-item alignment to timestamps.

### Integration

- `cm audio` with `--music` writes `audio.mix.json` and preserves `timestamps.json`.
- `cm render --audio-mix` adds additional audio layers without altering captions.
- `cm generate` passes audio options through to render outputs.

### V&V

- Layer 1 (schema): `AudioMixOutput` safeParse and cross-field checks.
- Layer 2 (programmatic checks): mix layers stay within voice duration, SFX density caps.
- Layer 4 (human): A/B check voice intelligibility and engagement on 30-60s samples.

## Rollout

- Defaults:
  - No music/SFX/ambience unless explicitly requested.
  - Ducking enabled when music is present.
- Backwards compatibility:
  - Existing `cm audio` outputs stay valid; `audio.mix.json` is optional.
  - `cm render` ignores mix plan if not provided.
- Telemetry/metrics:
  - Track audio option usage, mix warnings, and ASR word coverage.

## Related

- ADRs: none yet
- Guides: `docs/guides/guide-recommended-pipeline-20260109.md`
- References: `docs/reference/cm-audio-reference-20260106.md`, `docs/reference/cm-render-reference-20260106.md`
- Research: `docs/architecture/IMPL-PHASE-2-AUDIO-20260105.md`, `docs/architecture/SYNC-ARCHITECTURE-20260610.md`, `docs/specs/audio-breathing-room-spec-20260109.md`
- Tasks: none yet (create task when implementing)
