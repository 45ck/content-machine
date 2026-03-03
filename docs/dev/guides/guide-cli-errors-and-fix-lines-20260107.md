# guide-cli-errors-and-fix-lines-20260107

This guide defines the CLI error message contract for `cm` and how to implement it with actionable recovery.

## Contract

Every user-facing error must include:

- `ERROR: <what failed>` (short)
- `Fix: <what to do next>` (one line, commandable)
- optional `Context:` with relevant fields (paths, allowed values)

Exit codes:

- `2` invalid usage (bad flags, schema errors, missing input files)
- `1` runtime failure (API errors, render failures, dependency failures)

## Examples

### Invalid input file

```
ERROR: File not found: out/timestamps.json
Fix: run `cm audio -i out/script.json --timestamps out/timestamps.json`
```

### Invalid option value

```
ERROR: Unknown profile: mobile
Fix: use --profile portrait or --profile landscape
Context:
  allowed: ["portrait","landscape"]
```

## Implementation guidance

- Encode the fix in `error.context.fix` so both human mode and `--json` mode can surface it.
- Prefer producing-command fixes:
  - visuals input expects timestamps -> point to `cm audio`
  - render input expects visuals -> point to `cm visuals`
  - script research expects research -> point to `cm research`

## V&V checks

- Layer 2: integration tests assert error output includes `Fix:` and exit code matches (2 vs 1).
- Layer 4: run common failure drills on Windows terminal.

## Related

- `src/cli/format.ts`
- `src/cli/utils.ts`
