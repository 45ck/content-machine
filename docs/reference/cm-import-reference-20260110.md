# cm-import reference (20260110)

Import external assets into content-machine artifacts.

## Synopsis

```bash
cm import visuals --timestamps <path> [options]
```

## Inputs

- `--timestamps`: timestamps JSON file
- `--clips`: directory, file, or glob of local clips
- `--clip`: single clip path (alternative to `--clips`)

## Outputs

- `visuals.json` (default, configurable via `--output`)

## Options

- `--timestamps <path>`: input timestamps JSON file (required)
- `--clips <path>`: directory or glob of clips
- `--clip <path>`: single clip path
- `--mode <mode>`: `sequence|loop|map` (default: `sequence`)
- `--map <path>`: JSON mapping of sceneId -> clip path (required for `map` mode)
- `-o, --output <path>`: output visuals file path (default: `visuals.json`)

## Examples

```bash
# Build visuals from a directory of clips
cm import visuals --timestamps timestamps.json --clips assets/clips --output visuals.json

# Use a glob pattern
cm import visuals --timestamps timestamps.json --clips "assets/clips/*.mp4"

# Map specific scenes to specific clips
cm import visuals --timestamps timestamps.json --mode map --map mapping.json
```

## Notes

- Imported visuals use `source: "user-footage"` and local `assetPath` values.
- `cm render` will copy local clips into the render bundle for reliability.
- Imports validate local clip paths and reject tiny placeholder files; use a real video or transcode with ffmpeg if needed.

## See also

- `docs/reference/cm-timestamps-reference-20260110.md`
- `docs/reference/cm-render-reference-20260106.md`
