# cm-research reference (20260106)

Research a topic across multiple sources and optionally generate content angles.

## Synopsis

```bash
cm research [options]
```

## Required

- `-q, --query <query>`: search query

## Options

- `-s, --sources <sources>`: comma-separated list (default: `hackernews,reddit`)
- `-o, --output <path>`: output JSON path (default: `research.json`)
- `-l, --limit <number>`: per-source limit (default: `10`)
- `-t, --time-range <range>`: `hour|day|week|month|year|all` (default: `week`)
- `--no-angles`: skip angle generation
- `--max-angles <number>`: max angles (default: `3`)
- `--sequential`: run sources sequentially
- `--dry-run`: preview without API calls
- `--mock`: use fake LLM for angle generation

## Output

- Research JSON written to `--output`

## Examples

```bash
cm research -q "AI programming trends" -s hackernews,reddit -l 10 -t week -o out/research.json
cm research -q "Redis caching" --no-angles --dry-run
```
