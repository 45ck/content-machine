---
name: script-to-audio
description: Generate a voiceover WAV plus timestamps from a script artifact so a harness can hand off deterministic audio-stage outputs to later steps.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"scriptPath":"output/harness/script/script.json","outputDir":"output/harness/audio","voice":"af_heart","ttsSpeed":1,"outputMetadataPath":"output/harness/audio/audio.json"}'
entrypoint: node --import tsx scripts/harness/script-to-audio.ts
inputs:
  - name: scriptPath
    description: ScriptOutput artifact to synthesize and align.
    required: true
  - name: outputDir
    description: Directory that will receive audio.wav and timestamps.json.
    required: false
  - name: voice
    description: Voice id override for TTS.
    required: false
  - name: outputMetadataPath
    description: Optional output path for structured audio metadata.
    required: false
outputs:
  - name: audio.wav
    description: Final voiceover WAV artifact written under the output directory.
  - name: timestamps.json
    description: Word-level and scene-level timestamps artifact aligned to the generated audio.
  - name: audio.json
    description: Optional structured audio metadata written when requested.
---

# Script To Audio

## Use When

- The user already has a `script.json` artifact and wants the bounded
  audio stage only.
- A harness needs deterministic `audio.wav` and `timestamps.json`
  outputs before visuals or render work starts.
- Claude Code or Codex should produce reusable audio-stage artifacts
  instead of freeform narration text.

## Invocation

```bash
cat skills/script-to-audio/examples/request.json | \
  node --import tsx scripts/harness/script-to-audio.ts
```

## Artifact Contract

- Reads an existing `ScriptOutput` artifact from `scriptPath` without
  modifying it.
- Writes `audio.wav` and `timestamps.json` under the requested
  `outputDir`.
- Optionally writes `audio.json` when `outputMetadataPath` is supplied.
- Returns a JSON envelope with the written paths plus effective duration
  and voice metadata.

## Validation Checklist

- `audio.wav` exists and is non-empty.
- `timestamps.json` exists and reports word timings plus total duration.
- If `outputMetadataPath` was supplied, `audio.json` exists and matches
  the emitted audio artifact.
