# command

A **command** is a CLI entry that executes a stage (or orchestrates multiple stages).

## Canonical commands

- Stage commands: `cm script`, `cm audio`, `cm visuals`, `cm render`
- Orchestrator: `cm generate`

## Data layer meaning

- Stage commands should read/write the canonical artifacts for that stage.
- Command UX (help text, logs) should use ubiquitous language terms.

## Code references

- `docs/dev/guides/guide-ubiquitous-language-20260110.md`
- `src/cli/commands/` (command implementations)

## Related

- `docs/dev/glossary/stage.md`
