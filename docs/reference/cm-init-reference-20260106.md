# cm-init reference (20260106)

Interactive setup wizard that writes `.content-machine.toml` into the current directory.

## Synopsis

```bash
cm init [options]
```

## Outputs

- `.content-machine.toml` created in the current working directory

## Options

- `-y, --yes`: use defaults without prompting (default: false)

## Global options

- `-v, --verbose`: enable verbose logging
- `--json`: print a schema-versioned JSON envelope to stdout

## Exit codes

- `0`: success
- `1`: failure

## Examples

```bash
cm init
cm init --yes
```

## See also

- `docs/guides/guide-cli-ux-cm-init-20260106.md`
