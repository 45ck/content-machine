# guide-cli-ux-cm-package-20260106

UX review for `cm package` (topic -> `packaging.json`). Packaging is "creative leverage": it helps users get a stronger hook/title/cover without rewriting the whole script.

References: `docs/guides/guide-cli-ux-standards-20260106.md`.

## Who is the user here?

- Creator-operator: wants better hooks, titles, and cover text that match the platform.
- Researcher/ideation: wants variants to choose from and test.
- Engineer-operator: wants a stable artifact with a chosen "selected" variant.

## Job to be done

"Generate multiple packaging options and pick one I can apply to `cm script`."

## Current behavior (as implemented today)

- Spinner: "Generating packaging...".
- Validates `--platform` and normalizes `--variants`.
- Supports `--dry-run` and `--mock`.
- Writes `packaging.json` and prints a short summary including the selected variant.
- Supports `--json` mode with a versioned JSON envelope (stdout-only machine output).
- Prints a concrete next command to apply packaging to `cm script`.

## UX gaps

- Selection is opaque: users cannot control which variant becomes "selected" (index/strategy).

## Recommendations

### P0

- After success, print the exact next command:
  - `cm script --topic "<topic>" --package <output>`
- In `--verbose`, print the selected variant fields so creators can judge quickly.

### P1

- Add `--select <index|strategy>` to control `selected` (e.g., `--select 3` or `--select "highest-confidence"`).
- Expand `--json` envelope outputs to include `{platform, selected, selectedIndex}` (schema versioned).

## Ideal success output (ASCII sketch)

```
Packaging generated
Output: out/packaging.json
Selected: "Stop doing Redis caching like this"
Next: cm script --topic "Redis caching" --package out/packaging.json
```

## UX acceptance criteria

- Success output includes a concrete next command that applies the packaging to `cm script`.
- Output JSON includes a stable `selected` variant and preserves all variants.
- `--dry-run` performs no LLM calls and writes no files.
