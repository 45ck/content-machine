# cm-package reference (20260106)

Generate “packaging” variants (title/cover/hook) for a topic.

## Synopsis

```bash
cm package [options] <topic>
```

## Options

- `--platform <platform>`: `tiktok|reels|shorts` (default: `tiktok`)
- `--variants <count>`: number of variants (default: `5`)
- `-o, --output <path>`: output JSON path (default: `packaging.json`)
- `--dry-run`: preview without calling the LLM
- `--mock`: use a fake LLM provider (testing)

## Output

- Packaging JSON written to `--output` (includes a `selected` variant)

## Examples

```bash
cm package "Docker vs Kubernetes" --platform tiktok --variants 5 -o out/packaging.json
cm package "Redis vs PostgreSQL" --dry-run
```
