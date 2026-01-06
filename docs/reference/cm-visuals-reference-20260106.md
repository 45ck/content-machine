# cm-visuals reference (20260106)

Match visuals (e.g., stock footage) to scenes using the timestamps output.

## Synopsis

```bash
cm visuals [options]
```

## Inputs

- `--input`: timestamps JSON from `cm audio`

## Outputs

- Visuals JSON written to `--output` (default `visuals.json`)

## Options

- `-i, --input <path>`: input timestamps JSON file (required)
- `-o, --output <path>`: output visuals file path (default: `visuals.json`)
- `--provider <provider>`: stock footage provider id (default: `pexels`)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: intended for machine-readable output (not consistently implemented across commands yet)

## Exit codes

- `0`: success
- `1`: failure

## Examples

```bash
cm visuals -i out/timestamps.json -o out/visuals.json --provider pexels
```

## See also

- `docs/guides/guide-cli-ux-cm-visuals-20260106.md`
- `docs/reference/cm-render-reference-20260106.md`
