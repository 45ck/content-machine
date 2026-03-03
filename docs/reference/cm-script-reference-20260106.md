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
- `-a, --archetype <idOrPath>`: script archetype id or path to an archetype YAML file (default: `listicle`). Use `cm archetypes list`
- `-o, --output <path>`: output JSON path (default: `script.json`)
- `--package <path>`: packaging JSON from `cm package`
- `--research <path>`: research JSON from `cm research` (injects evidence into LLM prompt)
- `--duration <seconds>`: target duration seconds (default: `45`)
- `--dry-run`: preview without calling the LLM
- `--mock`: use a fake LLM provider (testing)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure
- `2`: schema validation error (e.g., invalid research file)

## Research Integration

When `--research <path>` is provided:

1. Research JSON is loaded and validated against `ResearchOutputSchema`
2. Evidence is formatted into a prompt context (max 2500 chars, top 10 items by relevance)
3. Context is prepended to the LLM prompt
4. Source URLs are tracked in `extra.research` in the output

**Output metadata with research:**

```json
{
  "scenes": [...],
  "extra": {
    "research": {
      "sources": ["https://example.com/article1", "https://example.com/article2"],
      "evidenceCount": 5,
      "query": "original search query"
    }
  }
}
```

## Examples

```bash
# Basic usage
cm script --topic "Redis vs PostgreSQL" --archetype versus -o out/script.json

# Dry run (preview without LLM call)
cm script --topic "5 JavaScript tips" --dry-run

# With packaging context
cm package "Redis vs PostgreSQL" -o out/packaging.json
cm script --topic "Redis vs PostgreSQL" --package out/packaging.json

# With research context (evidence-backed)
cm research -q "Redis caching best practices" -o out/research.json
cm script --topic "Redis caching" --research out/research.json -o out/script.json
```

## See also

- `docs/dev/guides/guide-cli-ux-cm-script-20260106.md`
- `docs/reference/cm-package-reference-20260106.md`
- `docs/reference/cm-research-reference-20260106.md`
- `docs/dev/features/feature-research-script-integration-20260107.md`
