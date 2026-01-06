# cm-visuals reference (20260106)

Match visuals (e.g., stock footage) to scenes using the timestamps output.

## Synopsis

```bash
cm visuals [options]
```

## Required

- `-i, --input <path>`: timestamps JSON (from `cm audio`)

## Options

- `-o, --output <path>`: output visuals JSON (default: `visuals.json`)
- `--provider <provider>`: provider id (default: `pexels`)

## Output

- Visuals JSON written to `--output`

## Examples

```bash
cm visuals -i timestamps.json -o out/visuals.json --provider pexels
```
