# Research Corpus

This folder is evidence and background material, not the first-run user
documentation path.

Use it when you need to understand why a capability exists, compare
external tools, or inspect historical source material. For current user
and agent operation, start with:

- [`docs/user/README.md`](../user/README.md)
- [`skills/README.md`](../../skills/README.md)
- [`flows/README.md`](../../flows/README.md)
- [`scripts/harness/README.md`](../../scripts/harness/README.md)

## Status

- `docs/research/archetypes/` contains curated short-form archetype
  research used by shipped skills.
- `docs/research/synthesis/` contains repo-level research summaries and
  conclusions.
- `docs/research/external/` contains imported source material and should
  be treated as a quarantine area. Do not mistake imported files for
  current product docs unless an active doc explicitly links them.
- Older investigation and architecture notes may describe surfaces that
  have since moved to skills, flows, or the thin `cm` shell.

When promoting research into active behavior, move the decision into a
skill, flow, user doc, or generated reference rather than linking users
directly into a large import dump.
