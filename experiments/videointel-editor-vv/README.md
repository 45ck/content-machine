# Editor V&V Experiment — Real-Video Round-Trip

Tests the full pipeline starting from programmatically composed MP4 files:

```
MP4 → cm videospec → VideoSpec.v1 → classify → VideoTheme.v1 → blueprint → VideoBlueprint.v1
```

## What it verifies

Videos are composed with **known structure** (ground truth): exact scene counts,
cut points, durations, pacing, and optional caption text. Pipeline outputs are
compared against this ground truth with configurable tolerances.

### Tier 1: FFmpeg-composed videos (no new deps)

- Color-bar segments + drawtext captions + sine audio
- Ground truth defined in TypeScript manifests
- FFmpeg only — zero network/install dependencies

### Tier 2: MLT XML projects (deferred)

- MLT XML parsed for ground truth
- Rendered via `melt` CLI (bundled with Shotcut portable)
- Activated when melt is available

## Manifests

| Manifest             | Scenes | Duration | Pacing    | Notes                 |
| -------------------- | ------ | -------- | --------- | --------------------- |
| three-scene-listicle | 3      | 21s      | moderate  | Captions + sine audio |
| single-shot-talking  | 1      | 30s      | slow      | Degenerate case       |
| five-scene-howto     | 5      | 45s      | moderate  | Step numbers          |
| montage-no-speech    | 15     | 15s      | very_fast | Fast cuts, no text    |

## Running

```bash
# Full run
npx tsx experiments/videointel-editor-vv/run.ts --verbose

# Single manifest
npx tsx experiments/videointel-editor-vv/run.ts --manifest three-scene-listicle

# Skip composition (reuse existing MP4s)
npx tsx experiments/videointel-editor-vv/run.ts --skip-compose
```

## Dependencies

| Tool          | Required | Impact if missing                 |
| ------------- | -------- | --------------------------------- |
| ffmpeg        | Yes      | Fatal — cannot compose or analyze |
| ffprobe       | Yes      | Fatal — analyze needs probe       |
| pyscenedetect | No       | Degraded shot detection accuracy  |
| whisper       | No       | Voiceover checks skipped          |
| tesseract     | No       | Caption text checks skipped       |
| melt          | No       | Tier 2 manifests skipped          |

## Output

Generated artifacts are written to `results/` (gitignored):

- `<name>.mp4` — composed test video
- `<name>.videospec.json` — VideoSpec.v1 output
- `<name>.theme.json` — VideoTheme.v1 classification
- `<name>.blueprint.json` — VideoBlueprint.v1 extraction
