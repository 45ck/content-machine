# cm-validate reference (20260106)

Validate a rendered video against platform requirements and write a JSON report.

## Synopsis

```bash
cm validate [options] <videoPath>
```

## Options

- `--profile <profile>`: `portrait|landscape` (default: `portrait`)
- `-o, --output <path>`: output report JSON (default: `validate.json`)
- `--json`: print full report JSON to stdout

## Output

- Validation report JSON written to `--output`
- Exit code `1` when validation fails

## Examples

```bash
cm validate out/video.mp4 --profile portrait -o out/validate.json
cm validate out/video.mp4 --json
```
