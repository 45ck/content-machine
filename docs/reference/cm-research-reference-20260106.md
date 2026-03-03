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
- `-s, --sources <sources>`: comma-separated sources `hackernews,reddit,web,tavily` (default: `hackernews,reddit`)
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

## Output Schema

```json
{
  "query": "search query",
  "evidence": [
    {
      "title": "Article Title",
      "url": "https://example.com/article",
      "source": "hackernews",
      "summary": "Brief summary...",
      "relevanceScore": 0.95,
      "publishedAt": "2026-01-05T12:00:00Z"
    }
  ],
  "suggestedAngles": [
    {
      "archetype": "listicle",
      "angle": "5 things you didn't know...",
      "hook": "Stop scrolling, this is important..."
    }
  ],
  "sources": ["hackernews", "reddit"],
  "searchedAt": "2026-01-07T10:00:00Z",
  "totalResults": 20
}
```

## Downstream Integration

Research output can be used by downstream commands:

### cm script

```bash
cm research -q "Redis caching" -o research.json
cm script --topic "Redis caching" --research research.json
```

The research evidence is injected into the script generation prompt, and source URLs are tracked in the output metadata.

### cm generate

```bash
# Auto-run research before script
cm generate "Redis caching" --research

# Use existing research file
cm generate "Redis caching" --research research.json
```

See [feature-research-script-integration-20260107.md](../dev/features/feature-research-script-integration-20260107.md) for full details.

## Examples

```bash
# Basic research with default sources
cm research -q "AI programming trends" -o out/research.json

# Research with specific sources and limit
cm research -q "AI programming trends" -s hackernews,reddit,tavily -l 10 -t week -o out/research.json

# Skip angle generation
cm research -q "Redis caching" --no-angles --dry-run

# Write retrieval index for RAG
cm research -q "Redis caching" --no-angles --index out/research.index.json

# Full workflow with script generation
cm research -q "TypeScript tips" -s tavily -l 5 -o research.json
cm script --topic "TypeScript tips" --research research.json -o script.json
```

## See also

- `docs/dev/guides/guide-cli-ux-cm-research-20260106.md`
- `docs/reference/cm-script-reference-20260106.md`
- `docs/dev/features/feature-research-script-integration-20260107.md`
