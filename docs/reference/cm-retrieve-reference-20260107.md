# cm-retrieve reference (20260107)

Query a local retrieval index artifact (prototype).

## Synopsis

```bash
cm retrieve [options]
```

## Options

- `--index <path>`: path to a retrieval index JSON file (required)
- `-q, --query <query>`: query string (required)
- `-k, --k <number>`: top-k results (default: `5`)
- `--json`: print results as JSON (default: false)

## Examples

```bash
cm retrieve --index out/research.index.json --query "redis cache" -k 5
cm retrieve --index out/research.index.json --query "postgres caching" --json
```

## See also

- `docs/reference/cm-research-reference-20260106.md`
