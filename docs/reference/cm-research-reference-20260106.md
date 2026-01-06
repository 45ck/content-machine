# cm-research reference (20260106)

Research a topic across multiple sources and optionally generate content angles.

## Synopsis

```bash
cm research [options]
```

## Outputs

- Research JSON written to `--output` (default `research.json`)

## Options

- `-q, --query <query>`: search query (required)
- `-s, --sources <sources>`: comma-separated sources `hackernews,reddit,web` (default: `hackernews,reddit`)
- `-o, --output <path>`: output JSON path (default: `research.json`)
- `--index <path>`: optional: write a local retrieval index JSON (default: empty / disabled)
- `-l, --limit <number>`: results per source (default: `10`)
- `-t, --time-range <range>`: `hour|day|week|month|year|all` (default: `week`)
- `--no-angles`: skip angle generation
- `--max-angles <number>`: maximum angles to generate (default: `3`)
- `--sequential`: run searches sequentially (default is parallel)
- `--dry-run`: preview without making API calls
- `--mock`: use mock LLM for angle generation

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure

## Examples

```bash
cm research -q "AI programming trends" -s hackernews,reddit -l 10 -t week -o out/research.json
cm research -q "Redis caching" --no-angles --dry-run
cm research -q "Redis caching" --no-angles --index out/research.index.json
```

## See also

- `docs/guides/guide-cli-ux-cm-research-20260106.md`
