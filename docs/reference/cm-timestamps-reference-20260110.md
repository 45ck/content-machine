# cm-timestamps reference (20260110)

Generate word-level timestamps from an existing audio file.

## Synopsis

```bash
cm timestamps --audio <path> [options]
```

## Inputs

- `--audio`: input audio file (wav/mp3/etc)
- `--script`: optional script JSON for reconciliation

## Outputs

- `timestamps.json` (default, configurable via `--output`)

## Options

- `--audio <path>`: input audio file (required)
- `--script <path>`: optional script JSON for reconciliation
- `-o, --output <path>`: output timestamps file path (default: `timestamps.json`)
- `--reconcile`: align ASR output to script punctuation/casing
- `--require-whisper`: require whisper ASR (fail if unavailable)
- `--whisper-model <model>`: tiny|base|small|medium|large (default: `base`)

## Examples

```bash
# Basic usage
cm timestamps --audio assets/voiceover.wav

# Reconcile to an existing script
cm timestamps --audio assets/voiceover.wav --script script.json --reconcile

# Save to a custom path
cm timestamps --audio audio.wav --output output/timestamps.json
```

## Notes

- Uses whisper.cpp when available; with `--require-whisper`, it fails fast if whisper is missing.
- Output is compatible with `cm import visuals` and `cm render`.

## See also

- `docs/reference/cm-import-reference-20260110.md`
- `docs/reference/cm-render-reference-20260106.md`
