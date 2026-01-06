# cm-script reference (20260106)

Generate a scene-by-scene script JSON from a topic.

## Synopsis

```bash
cm script [options]
```

## Required

- `-t, --topic <topic>`: topic string

## Options

- `-a, --archetype <type>`: `listicle|versus|howto|myth|story|hot-take` (default: `listicle`)
- `-o, --output <path>`: output JSON path (default: `script.json`)
- `--package <path>`: packaging JSON from `cm package` (optional)
- `--duration <seconds>`: target duration (default: `45`)
- `--dry-run`: preview without calling the LLM
- `--mock`: use a fake LLM provider (testing)

## Output

- Script JSON written to `--output`

## Examples

```bash
cm script --topic "Redis vs PostgreSQL" --archetype versus -o out/script.json
cm script --topic "5 JavaScript tips" --dry-run
cm package "Redis vs PostgreSQL" -o packaging.json
cm script --topic "Redis vs PostgreSQL" --package packaging.json
```
