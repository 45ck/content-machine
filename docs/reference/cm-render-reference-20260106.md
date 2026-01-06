# cm-render reference (20260106)

Render the final MP4 using Remotion from visuals + timestamps + audio.

## Synopsis

```bash
cm render [options]
```

## Required

- `-i, --input <path>`: visuals JSON (from `cm visuals`)
- `--audio <path>`: audio WAV (from `cm audio`)

## Options

- `--timestamps <path>`: timestamps JSON path (default: `timestamps.json`)
- `-o, --output <path>`: output video path (default: `video.mp4`)
- `--orientation <type>`: `portrait|landscape|square` (default: `portrait`)
- `--fps <fps>`: frames per second (default: `30`)

## Output

- Video MP4 written to `--output`

## Examples

```bash
cm render -i visuals.json --audio audio.wav --timestamps timestamps.json -o out/video.mp4
cm render -i out/visuals.json --audio out/audio.wav --orientation portrait --fps 30
```
