# cm-media reference (20260217)

Create media synthesis artifacts from `visuals.json`.

This command is used for:

- Video keyframe extraction (video -> image)
- Advanced motion strategies for images (image -> video), such as `depthflow` or `veo`

## Synopsis

```bash
cm media [options]
```

## Inputs

- `--input`: visuals JSON from `cm visuals`

## Outputs

- Media manifest JSON written to `--output` (default `media-manifest.json`)
- Generated media artifacts written under `--media-dir` (default `./media/`)

## Options

- `-i, --input <path>`: input visuals JSON file (required)
- `-o, --output <path>`: output media manifest path (default: `media-manifest.json`)
- `--media-dir <path>`: directory for generated media artifacts (default: `media`)
- `--ffmpeg <path>`: ffmpeg executable path (default: `ffmpeg`)
- `--no-keyframes`: disable keyframe extraction (manifest only)
- `--no-synthesize-motion`: disable image-to-video synthesis for `depthflow`/`veo` scenes
- `--depthflow-adapter <id>`: adapter id for depthflow synthesis (default: `static-video`)
- `--veo-adapter <id>`: adapter id for veo synthesis (default: `static-video`)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure
- `2`: invalid arguments / missing files / invalid JSON

## Examples

```bash
cm media -i output/visuals.json -o output/media-manifest.json --media-dir output/media
```

## See also

- `docs/reference/cm-visuals-reference-20260106.md`
- `docs/reference/cm-render-reference-20260106.md`
