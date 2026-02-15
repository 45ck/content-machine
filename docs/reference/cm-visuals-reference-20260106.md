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
- `--orientation <type>`: `portrait|landscape|square` (default: `portrait`)
- `--mock`: use mock visuals (no API calls)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure
- `2`: invalid arguments / missing files / invalid JSON

## Examples

```bash
cm visuals -i out/timestamps.json -o out/visuals.json --provider pexels
```

## See also

- `docs/dev/guides/guide-cli-ux-cm-visuals-20260106.md`
- `docs/reference/cm-render-reference-20260106.md`
