# cm-score reference (20260107)

Score `script.json` for quality/risk proxies and write `score.json`.

## Synopsis

```bash
cm score [options]
```

## Outputs

- Score JSON written to `--output` (default `score.json`)
- Exit code 1 if `--min-overall` is not met or an error-level check fails

## Options

- `-i, --input <path>`: input `script.json` path (required)
- `--package <path>`: optional `packaging.json` path (enables alignment checks)
- `-o, --output <path>`: output `score.json` path (default: `score.json`)
- `--min-overall <n>`: fail if overall score is below threshold (default: `0`)
- `--json`: print the full `score.json` to stdout (default: false)

## Examples

```bash
cm score --input out/script.json --output out/score.json
cm score --input out/script.json --package out/packaging.json --min-overall 0.8
cm score --input out/script.json --json
```
