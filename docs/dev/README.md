# Developer Docs

Read this in the context of the harness-first pivot:

- direction and cut lines live in [`DIRECTION.md`](../../DIRECTION.md) and
  [`docs/direction/`](../direction/)
- active public surfaces are `skills/`, `flows/`, and
  `scripts/harness/`
- much of the older CLI architecture under `docs/dev/architecture/`
  remains useful, but it describes a surface that is being demoted

This repo has strict "single source of truth" systems. If you're
updating docs, contracts, or wording, start here:

- Repo facts registry (edit): `registry/repo-facts.yaml`
  - Generated reference (do not edit): [`docs/reference/REPO-FACTS.md`](../reference/REPO-FACTS.md)
  - Generated env var names (do not edit): [`docs/reference/ENVIRONMENT-VARIABLES.md`](../reference/ENVIRONMENT-VARIABLES.md)
- Ubiquitous language registry (edit): `registry/ubiquitous-language.yaml`
  - Generated glossary (do not edit): [`docs/reference/GLOSSARY.md`](../reference/GLOSSARY.md)
  - System explainer: [`docs/reference/ubiquitous-language-system-20260210.md`](../reference/ubiquitous-language-system-20260210.md)

Primary dev docs (dated):

- Current direction: [`DIRECTION.md`](../../DIRECTION.md),
  [`docs/direction/`](../direction/)
- Architecture: [`docs/dev/architecture/`](architecture/)
- Guides: [`docs/dev/guides/`](guides/)
- Feature specs: [`docs/dev/features/`](features/)
- Bugs: [`docs/dev/bugs/`](bugs/)
- Specs: [`docs/dev/specs/`](specs/)
- Code-first glossary (term -> code references): [`docs/dev/glossary/`](glossary/)
- Research: [`docs/research/`](../research/)

User docs (undated, enforced):

- [`docs/user/`](../user/)

Archive policy:

- [`archive/README.md`](../../archive/README.md)
