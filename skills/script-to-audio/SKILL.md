---
name: script-to-audio
description: Generate a voiceover WAV plus timestamps from a script file so later steps can build captions and video from it.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"scriptPath":"output/content-machine/script/script.json","outputDir":"output/content-machine/audio","voice":"af_heart","ttsSpeed":1,"outputMetadataPath":"output/content-machine/audio/audio.json"}'
entrypoint: node --import tsx scripts/harness/script-to-audio.ts
inputs:
  - name: scriptPath
    description: Script file to synthesize and align.
    required: true
  - name: outputDir
    description: Directory that will receive audio.wav and timestamps.json.
    required: false
  - name: voice
    description: Voice id override for TTS.
    required: false
  - name: outputMetadataPath
    description: Optional output path for audio metadata.
    required: false
outputs:
  - name: audio.wav
    description: Final voiceover WAV file.
  - name: timestamps.json
    description: Word-level and scene-level timestamps aligned to the generated audio.
  - name: audio.json
    description: Optional audio metadata written when requested.
---

# Script To Audio

## Use When

- The user already has a `script.json` file and wants the bounded audio
  step only.
- The agent needs `audio.wav` and `timestamps.json` before visuals or
  render work starts.
- Claude Code or Codex should produce reusable audio-stage files
  instead of freeform narration text.

## Invocation

```bash
cat skills/script-to-audio/examples/request.json | \
  node --import tsx scripts/harness/script-to-audio.ts
```

## Output Contract

- Reads an existing `script.json` file from `scriptPath` without
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
  the emitted audio file.
