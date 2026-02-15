# Documentation

This repo separates docs by audience:

- Users: [`docs/user/README.md`](user/README.md)
- Developers: [`docs/dev/README.md`](dev/README.md)
- Canonical reference (generated + command references): [`docs/reference/`](reference/)
- Research archive: [`docs/research/`](research/)

## Single Sources Of Truth

If a fact is repeated in multiple places, it should come from one of these registries:

- Repo facts registry (source of truth): `registry/repo-facts.yaml`
  - Generated docs (do not edit): [`docs/reference/REPO-FACTS.md`](reference/REPO-FACTS.md)
  - Generated env var names (do not edit): [`docs/reference/ENVIRONMENT-VARIABLES.md`](reference/ENVIRONMENT-VARIABLES.md)
- Ubiquitous language registry (source of truth): `registry/ubiquitous-language.yaml`
  - Generated glossary (do not edit): [`docs/reference/GLOSSARY.md`](reference/GLOSSARY.md)
  - System explainer: [`docs/reference/ubiquitous-language-system-20260210.md`](reference/ubiquitous-language-system-20260210.md)

## Date Convention

Docs in `docs/dev/architecture/`, `docs/dev/features/`, `docs/dev/guides/`, `docs/research/`, etc use `-YYYYMMDD` suffixes.
User docs (`docs/user/`) are stable, undated entry points.

## Quick Links

Users:

- Quickstart: [`docs/user/QUICKSTART.md`](user/QUICKSTART.md)
- Configuration: [`docs/user/CONFIGURATION.md`](user/CONFIGURATION.md)
- Examples: [`docs/user/EXAMPLES.md`](user/EXAMPLES.md)

Canonical references (generated; do not edit):

- Repo facts: [`docs/reference/REPO-FACTS.md`](reference/REPO-FACTS.md)
- Environment variables: [`docs/reference/ENVIRONMENT-VARIABLES.md`](reference/ENVIRONMENT-VARIABLES.md)
- Config surface: [`docs/reference/CONFIG-SURFACE.md`](reference/CONFIG-SURFACE.md)
- Pipeline presets: [`docs/reference/PIPELINE-PRESETS.md`](reference/PIPELINE-PRESETS.md)

Core design:

- System design: [`docs/dev/architecture/SYSTEM-DESIGN-20260104.md`](dev/architecture/SYSTEM-DESIGN-20260104.md)
- Project overview: [`AGENTS.md`](../AGENTS.md)
