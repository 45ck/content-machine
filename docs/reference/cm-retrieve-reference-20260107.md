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
- `-o, --output <path>`: output results JSON file (default: `retrieve.json`)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure
- `2`: invalid arguments / missing files / invalid JSON

## Examples

```bash
cm retrieve --index out/research.index.json --query "redis cache" -k 5
cm retrieve --index out/research.index.json --query "postgres caching" --output out/retrieve.json
```

## See also

- `docs/reference/cm-research-reference-20260106.md`
