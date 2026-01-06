# cm-audio reference (20260106)

Generate a voiceover WAV and word-level timestamps from a script JSON.

## Synopsis

```bash
cm audio [options]
```

## Required

- `-i, --input <path>`: input script JSON (from `cm script`)

## Options

- `-o, --output <path>`: output WAV path (default: `audio.wav`)
- `--timestamps <path>`: output timestamps JSON path (default: `timestamps.json`)
- `--voice <voice>`: TTS voice id (default: `af_heart`)

## Output

- Audio WAV at `--output`
- Timestamps JSON at `--timestamps`

## Examples

```bash
cm audio -i script.json -o out/audio.wav --timestamps out/timestamps.json
cm audio -i out/script.json --voice af_heart
```
