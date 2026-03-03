# guide-cli-ux-cm-audio-20260106

UX review for `cm audio` (script -> `audio.wav` + `timestamps.json`). This command is where "waiting" begins (TTS/ASR can be slow), so progress feedback and recoverability matter.

References: `docs/dev/guides/guide-cli-ux-standards-20260106.md`.

## Who is the user here?

- Creator-operator: wants to hear the voiceover and see accurate word timing for captions.
- Engineer-operator: wants stable outputs and clear failure causes (missing engines, missing models).
- Contributor/debugger: wants mockability and deterministic fixtures.

## Job to be done

"Turn my script into audio and word-level timing I can trust for caption highlighting."

## Current behavior (as implemented today)

- Spinner: "Generating audio...".
- Reads `--input` as JSON and calls `generateAudio()` with:
  - `outputPath` (default `audio.wav`)
  - `timestampsPath` (default `timestamps.json`)
  - `voice` (default `af_heart`)
- Prints a short summary with duration, word count, and the two output paths.

## UX gaps (what will frustrate users)

- Input trust: the CLI does not validate that the input JSON matches the expected script schema before doing work.
- Voice discoverability: users have no way to list available voices; invalid voices fail late.
- Progress: a single spinner hides multi-step work (TTS, ASR, alignment).

## Recommendations

### P0

- Validate the input JSON against the script schema at the CLI boundary; return exit code 2 for schema failures.
- Add step-level progress messages ("TTS", "ASR", "Align") and print which step failed.
- On failure, include a "Fix:" line that points to the dependency (voice id, model, executable path).

### P1

- Add `--json` output with `{audioPath, timestampsPath, durationSeconds, wordCount}`.
- Add `cm audio --list-voices` (or document the supported voice set) to prevent guessing.

## Ideal success output (ASCII sketch)

```
Audio generated
Duration: 42.3s
Outputs: out/audio.wav, out/timestamps.json
Next: cm visuals -i out/timestamps.json -o out/visuals.json
```

## UX acceptance criteria

- Invalid/mismatched `--input` JSON fails fast with exit code 2 and a schema-oriented message.
- Progress indicates which sub-step is running (TTS/ASR/align), and failures name the sub-step.
- Success output prints both artifact paths and duration.
