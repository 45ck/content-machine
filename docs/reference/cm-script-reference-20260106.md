# cm-script reference (20260106)

Generate a scene-by-scene script JSON from a topic.

## Synopsis

```bash
cm script [options]
```

## Outputs

- Script JSON written to `--output` (default `script.json`)

## Options

- `-t, --topic <topic>`: topic string (required)
- `-a, --archetype <type>`: `listicle|versus|howto|myth|story|hot-take` (default: `listicle`)
- `-o, --output <path>`: output JSON path (default: `script.json`)
- `--package <path>`: packaging JSON from `cm package`
- `--research <path>`: research JSON from `cm research`
- `--duration <seconds>`: target duration seconds (default: `45`)
- `--dry-run`: preview without calling the LLM
- `--mock`: use a fake LLM provider (testing)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure

## Examples

```bash
cm script --topic "Redis vs PostgreSQL" --archetype versus -o out/script.json
cm script --topic "5 JavaScript tips" --dry-run
cm package "Redis vs PostgreSQL" -o out/packaging.json
cm script --topic "Redis vs PostgreSQL" --package out/packaging.json
```

## See also

- `docs/guides/guide-cli-ux-cm-script-20260106.md`
- `docs/reference/cm-package-reference-20260106.md`
