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
- `--cadence`: enable cadence gate (scene cut frequency) via ffmpeg (default: false)
- `--cadence-engine <engine>`: cadence engine `ffmpeg|pyscenedetect` (default: `ffmpeg`)
- `--cadence-max-median <seconds>`: max median cut interval in seconds (default: `3`)
- `--cadence-threshold <n>`: scene change threshold (ffmpeg ~0-1, pyscenedetect ~0-100) (default: `0.3`)
- `--quality`: enable visual quality gate (BRISQUE) via Python (default: false)
- `--quality-sample-rate <n>`: analyze every Nth frame (BRISQUE) (default: `30`)
- `-o, --output <path>`: output report file path (default: `validate.json`)
- `--report-json`: print the full report JSON to stdout (not envelope) (default: false)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: validation passed
- `1`: validation failed or command error
- `2`: invalid arguments / missing files / invalid JSON

## Examples

```bash
cm validate out/video.mp4 --profile portrait -o out/validate.json
cm validate out/video.mp4 --report-json
cm validate out/video.mp4 --cadence --cadence-engine ffmpeg --cadence-max-median 3 --cadence-threshold 0.3
cm validate out/video.mp4 --cadence --cadence-engine pyscenedetect --python python
cm validate out/video.mp4 --quality --python python --quality-sample-rate 30
```

## See also

- `docs/guides/guide-cli-ux-cm-validate-20260106.md`
