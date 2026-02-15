# stage

A **stage** is one logical step in the pipeline that reads inputs and produces artifacts.

## Data layer meaning

- Each stage should have a primary input and a primary output artifact.
- Stages communicate through artifacts rather than shared in-memory objects.

## Canonical stages

- `script`
- `audio`
- `visuals`
- `render`

## Code references

- `docs/dev/guides/guide-ubiquitous-language-20260110.md` (Pipeline and artifacts)
- `docs/dev/architecture/SYSTEM-DESIGN-20260104.md` (pipeline design)

## Related

- `docs/dev/glossary/command.md`
- `docs/dev/glossary/artifact.md`
