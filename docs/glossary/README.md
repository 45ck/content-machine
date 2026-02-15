# Glossary (Code-First, Supplemental)

This folder defines **content-machine** terminology and the **data layer** from the bottom up, by pointing directly at the code that implements each concept.

Use this when you need to answer: “What does this word/field mean in our system?” without guessing.

## What this is (and is not)

- **This is:** a set of small reference docs that map **domain terms → concrete code and schema fields**.
- **This is not:** the canonical source of term definitions.

Canonical sources (single source of truth):

- Registry: `registry/ubiquitous-language.yaml`
- Generated glossary: `docs/reference/GLOSSARY.md`
- System explainer: `docs/reference/ubiquitous-language-system-20260210.md`

## Rules (to keep the domain harmonized)

0. **Do not redefine terms here.** If a definition changes, update `registry/ubiquitous-language.yaml`.
1. **One concept, one name.** If multiple names exist in code (legacy), document the canonical name and mark the others as legacy.
2. **Every glossary entry must include code references.** Link to the TypeScript file(s) and the schema(s) that define the behavior and shape.
3. **Artifacts are contracts.** Fields in `script.json`, `timestamps.json`, and `visuals.json` are stable APIs; changes require a `schemaVersion` bump and (when feasible) a migration path.
4. **Prefer explicit units.** Use `seconds`, `px`, `Hz` in field meanings and examples.
5. **Match CLI wording to the ubiquitous language.** CLI help text, logs, and errors should use the canonical terms.

## How to add a glossary entry

Create a new file in this folder:

- `docs/glossary/<term>.md`

Keep entries short, and include:

- **Purpose** (1 sentence)
- **Canonical terms** (and any legacy aliases)
- **Data shape** (artifact fields + meaning)
- **Code references** (file paths and key symbols)
- **Related** (link to guides/architecture/features)

## Index

- `docs/glossary/stage.md`
- `docs/glossary/command.md`
- `docs/glossary/artifact.md`
- `docs/glossary/schema-version.md`
- `docs/glossary/template.md`
- `docs/glossary/template-pack.md`
- `docs/glossary/composition.md`
- `docs/glossary/scene.md`
- `docs/glossary/scene-id.md`
- `docs/glossary/scene-timestamp.md`
- `docs/glossary/word-timestamp.md`
- `docs/glossary/visual-asset.md`
- `docs/glossary/cmerror.md`
- `docs/glossary/error-code.md`
- `docs/glossary/retryable.md`

## Related

- `docs/reference/GLOSSARY.md`
- `registry/ubiquitous-language.yaml`
- `docs/reference/ubiquitous-language-system-20260210.md`
- `docs/dev/architecture/SYSTEM-DESIGN-20260104.md`
