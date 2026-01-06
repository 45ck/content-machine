# cm-validate reference (20260106)

Validate a rendered video against platform requirements and write a JSON report.

## Synopsis

```bash
cm validate [options] <videoPath>
```

## Outputs

- Validation report JSON written to `--output` (default `validate.json`)
- Exit code 1 when validation fails (default behavior)

## Options

- `--profile <profile>`: `portrait|landscape` (default: `portrait`)
- `--probe-engine <engine>`: `ffprobe|python` (default: `ffprobe`)
- `--ffprobe <path>`: ffprobe executable path (default: `ffprobe`)
- `--python <path>`: python executable path (used for `--probe-engine python` and quality) (default: `python`)
- `--quality`: enable visual quality gate (BRISQUE) via Python (default: false)
- `--quality-sample-rate <n>`: analyze every Nth frame (BRISQUE) (default: `30`)
- `-o, --output <path>`: output report file path (default: `validate.json`)
- `--json`: print the full report JSON to stdout (default: false)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: root option exists but this command also defines `--json` (see UX doc for alignment recommendation)

## Exit codes

- `0`: validation passed
- `1`: validation failed or command error

## Examples

```bash
cm validate out/video.mp4 --profile portrait -o out/validate.json
cm validate out/video.mp4 --json
cm validate out/video.mp4 --quality --python python --quality-sample-rate 30
```

## See also

- `docs/guides/guide-cli-ux-cm-validate-20260106.md`
