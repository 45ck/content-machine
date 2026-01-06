# cm-package reference (20260106)

Generate "packaging" variants (title/cover/hook) for a topic.

## Synopsis

```bash
cm package [options] <topic>
```

## Outputs

- Packaging JSON written to `--output` (default `packaging.json`) and includes a `selected` variant

## Options

- `--platform <platform>`: `tiktok|reels|shorts` (default: `tiktok`)
- `--variants <count>`: number of variants (default: `5`)
- `-o, --output <path>`: output JSON path (default: `packaging.json`)
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
cm package "Docker vs Kubernetes" --platform tiktok --variants 5 -o out/packaging.json
cm package "Redis vs PostgreSQL" --dry-run
```

## See also

- `docs/guides/guide-cli-ux-cm-package-20260106.md`
- `docs/reference/cm-script-reference-20260106.md`
