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

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: score passed threshold
- `1`: score failed threshold
- `2`: invalid arguments / missing files / invalid JSON

## Examples

```bash
cm score --input out/script.json --output out/score.json
cm score --input out/script.json --package out/packaging.json --min-overall 0.8
cm score --input out/script.json --json
```
