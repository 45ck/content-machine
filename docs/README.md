# Documentation

Content Machine is in a harness-first migration. Read the docs in this
order:

- primary: skills, flows, harness scripts, direction docs
- compatibility: legacy CLI user docs and generated CLI references
- history: archived code and old engineering surfaces

## Direction

- [`DIRECTION.md`](../DIRECTION.md) — where Content Machine is heading (harness-first runtime)
- [`direction/`](direction/) — phase plan, boundaries, keep/move/deprecate

## Primary Surfaces

- [`../skills/README.md`](../skills/README.md) — harness-facing skill scaffolding for Claude Code, Codex CLI, and similar agents
- [`../flows/README.md`](../flows/README.md) — flow scaffolding and authoring rules for prompt-language orchestration
- [`user/HARNESS-QUICKSTART.md`](user/HARNESS-QUICKSTART.md) — primary user path for the harness-first surface
- [`../scripts/harness/README.md`](../scripts/harness/README.md) — executable JSON-stdio entrypoints

## Compatibility Surface

These docs remain useful, but they describe the legacy `cm` path rather
than the primary interface:

- [Installation](user/INSTALLATION.md)
- [Legacy CLI Quickstart](user/QUICKSTART.md)
- [CLI Compatibility Reference](user/CLI.md)
- [Configuration](user/CONFIGURATION.md)
- [Examples](user/EXAMPLES.md)

Full index: [docs/user/README.md](user/README.md)

## For Contributors

- [Contributing Guide](../CONTRIBUTING.md) — setup, workflow, PR process
- [Developer Docs](dev/README.md) — architecture, specs, guides
- [Research Archive](research/) — 86+ research documents
- [Archive Policy](../archive/README.md) — frozen legacy code and restore policy

## Reference (Generated)

These are auto-generated from registries — edit the YAML source, not the output:

- [Repo Facts](reference/REPO-FACTS.md) ← `registry/repo-facts.yaml`
- [Environment Variables](reference/ENVIRONMENT-VARIABLES.md) ← `registry/repo-facts.yaml`
- [Config Surface](reference/CONFIG-SURFACE.md) ← `registry/repo-facts.yaml`
- [Glossary](reference/GLOSSARY.md) ← `registry/ubiquitous-language.yaml`
- [Pipeline Presets](reference/PIPELINE-PRESETS.md) ← `registry/repo-facts.yaml`

Regenerate with: `npm run repo-facts:gen` / `npm run glossary:gen`

## CLI Command References (Compatibility)

- [`cm generate`](reference/cm-generate-reference-20260106.md)
- [`cm script`](reference/cm-script-reference-20260106.md)
- [`cm audio`](reference/cm-audio-reference-20260106.md)
- [`cm visuals`](reference/cm-visuals-reference-20260106.md)
- [`cm media`](reference/cm-media-reference-20260217.md)
- [`cm render`](reference/cm-render-reference-20260106.md)
- [`cm templates`](reference/cm-templates-reference-20260210.md)
- [`cm setup`](reference/cm-setup-reference-20260111.md)
- [`cm init`](reference/cm-init-reference-20260106.md)
- [`cm research`](reference/cm-research-reference-20260106.md)

## Demo Gallery

- [Demo assets](demo/) — GIFs and preview media for README

## Conventions

- **User docs** (`docs/user/`): stable, undated entry points
- **Dev docs** (`docs/dev/`): dated filenames with `-YYYYMMDD` suffix
- **Reference docs** (`docs/reference/`): auto-generated, do not edit
