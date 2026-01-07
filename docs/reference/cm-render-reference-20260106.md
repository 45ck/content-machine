# cm-render reference (20260106)

Render the final MP4 using Remotion from visuals + timestamps + audio.

## Synopsis

```bash
cm render [options]
```

## Inputs

- `--input`: visuals JSON from `cm visuals`
- `--audio`: audio WAV from `cm audio`
- `--timestamps`: timestamps JSON from `cm audio` (default `timestamps.json`)

## Outputs

- Video MP4 at `--output` (default `video.mp4`)

## Options

- `-i, --input <path>`: input visuals JSON file (required)
- `--audio <path>`: audio file path (required)
- `--timestamps <path>`: timestamps JSON file (default: `timestamps.json`)
- `-o, --output <path>`: output video file path (default: `video.mp4`)
- `--orientation <type>`: `portrait|landscape|square` (default: `portrait`)
- `--fps <fps>`: frames per second (default: `30`)
- `--mock`: use mock renderer (writes a placeholder MP4)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure
- `2`: invalid arguments / missing files / invalid JSON

## Examples

```bash
cm render -i out/visuals.json --audio out/audio.wav --timestamps out/timestamps.json -o out/video.mp4
cm render -i visuals.json --audio audio.wav --orientation portrait --fps 30
```

## See also

- `docs/guides/guide-cli-ux-cm-render-20260106.md`
- `docs/reference/cm-validate-reference-20260106.md`
