# cm-audio reference (20260106)

Generate a voiceover WAV and word-level timestamps from a script JSON.

## Synopsis

```bash
cm audio [options]
```

## Inputs

- `--input`: script JSON from `cm script`

## Outputs

- Audio WAV at `--output` (default `audio.wav`)
- Timestamps JSON at `--timestamps` (default `timestamps.json`)

## Options

- `-i, --input <path>`: input script JSON file (required)
- `-o, --output <path>`: output audio file path (default: `audio.wav`)
- `--timestamps <path>`: output timestamps file path (default: `timestamps.json`)
- `--voice <voice>`: TTS voice id (default: `af_heart`)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: intended for machine-readable output (not consistently implemented across commands yet)

## Exit codes

- `0`: success
- `1`: failure

## Examples

```bash
cm audio -i out/script.json -o out/audio.wav --timestamps out/timestamps.json
cm audio -i script.json --voice af_heart
```

## See also

- `docs/guides/guide-cli-ux-cm-audio-20260106.md`
- `docs/reference/cm-visuals-reference-20260106.md`
