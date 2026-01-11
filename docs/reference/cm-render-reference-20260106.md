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
- `--audio-mix`: optional mix plan from `cm audio`

## Outputs

- Video MP4 at `--output` (default `video.mp4`)

## Options

- `-i, --input <path>`: input visuals JSON file (required)
- `--audio <path>`: audio file path (required)
- `--audio-mix <path>`: audio mix plan JSON file (optional)
- `--timestamps <path>`: timestamps JSON file (default: `timestamps.json`)
- `-o, --output <path>`: output video file path (default: `video.mp4`)
- `--orientation <type>`: `portrait|landscape|square` (default: `portrait`)
- `--fps <fps>`: frames per second (default: `30`)
- `--hook <idOrPath>`: hook intro clip id, local path, or URL
- `--hook-library <id>`: hook library id (defaults to config)
- `--hooks-dir <path>`: root directory for hook libraries (defaults to config)
- `--download-hook`: download hook clip from the selected library if missing (default: false)
- `--mock`: use mock renderer (writes a placeholder MP4)
- `--download-assets`: download remote visuals into the bundle (default: true)
- `--no-download-assets`: stream remote visuals directly (no download)
- `--preflight`: validate inputs and exit without rendering

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout
- `--offline`: disable on-demand downloads
- `-y, --yes`: allow safe auto-downloads where supported

## Exit codes

- `0`: success
- `1`: failure
- `2`: invalid arguments / missing files / invalid JSON

## Examples

```bash
cm render -i out/visuals.json --audio out/audio.wav --timestamps out/timestamps.json -o out/video.mp4
cm render -i visuals.json --audio audio.wav --orientation portrait --fps 30
cm render -i visuals.json --audio audio.wav --audio-mix audio.mix.json --timestamps timestamps.json -o video.mp4
```

## Notes

- Local visuals with `source: "user-footage"` are copied into the render bundle for reliable playback.
- Use `--download-assets` (default) to cache remote stock footage inside the bundle.
- Local clips are validated before render (file size + optional ffprobe); install ffprobe for deeper checks and clearer errors.

## See also

- `docs/guides/guide-cli-ux-cm-render-20260106.md`
- `docs/guides/guide-audio-options-20260110.md`
- `docs/reference/cm-validate-reference-20260106.md`
