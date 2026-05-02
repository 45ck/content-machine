# Documentation

Content Machine is now centered on a short-form video skill pack. Read
the docs in this order:

- primary: agent quickstart, archetypes, showcase, examples, skills,
  flows, runtime scripts
- setup: installation, configuration, provider docs, quality review
- compatibility: thin `cm` shell docs, archived CLI docs, generated CLI
  references
- history: archived code and old engineering surfaces

## Direction

- [`DIRECTION.md`](../DIRECTION.md) — where Content Machine is heading (skill pack + runtime)
- [`direction/`](direction/) — phase plan, boundaries, keep/move/deprecate
- [`direction/08-archetype-rollout-20260427.md`](direction/08-archetype-rollout-20260427.md) — the full short-form lane catalog and proving order
- [`direction/09-vendor-archetype-backlog-20260429.md`](direction/09-vendor-archetype-backlog-20260429.md) — next lanes discovered from vendor/repo research

## Primary Surfaces

- [`../skills/README.md`](../skills/README.md) — short-form video skill scaffolding for Claude Code, Codex CLI, and similar agents
- [`../flows/README.md`](../flows/README.md) — `45ck/prompt-language` flow scaffolding and authoring rules
- [`user/AGENT-QUICKSTART.md`](user/AGENT-QUICKSTART.md) — primary user path for the skill-pack surface
- [`user/INSTALLATION.md`](user/INSTALLATION.md) — local setup,
  optional dependencies, and install checks
- [`user/CONFIGURATION.md`](user/CONFIGURATION.md) — config locations,
  providers, and data-driven resources
- [`user/ARCHETYPES.md`](user/ARCHETYPES.md) — choose the right short-form lane and see maturity status
- [`user/showcase/README.md`](user/showcase/README.md) — fast visual map
  of demos, skills, and maturity
- [`user/QUALITY-AND-REVIEW.md`](user/QUALITY-AND-REVIEW.md) — review gates before promoting a render
- [`user/CREATIVE-SOURCES.md`](user/CREATIVE-SOURCES.md) — external
  source scouting for animation, 3D, stock, audio, and AI generation
- [`user/examples/README.md`](user/examples/README.md) — categorized
  example-page index
- [`user/EXAMPLES.md`](user/EXAMPLES.md) — status summary and selected
  runnable walkthroughs
- [`user/examples/reddit-post-over-gameplay.md`](user/examples/reddit-post-over-gameplay.md) — golden reference example lane
- [`../scripts/harness/README.md`](../scripts/harness/README.md) — executable JSON-stdio entrypoints

## Compatibility Surface

These docs remain useful, but they describe the thin surviving `cm`
shell, generated CLI references, or archived legacy paths rather than
the primary interface:

- [Legacy CLI Archive](../archive/legacy-cli/README.md)

Full index: [docs/user/README.md](user/README.md)

## For Contributors

- [Contributing Guide](../CONTRIBUTING.md) — setup, workflow, PR process
- [Developer Docs](dev/README.md) — architecture, specs, guides
- [Research Archive](research/) — 86+ research documents
- [Short-Form Archetype Research](research/archetypes/) — repo-derived patterns, workflows, and quality rubrics
- [Archive Policy](../archive/README.md) — frozen legacy code and restore policy

## Reference (Generated)

These are auto-generated from registries — edit the YAML source, not the output:

- [Repo Facts](reference/REPO-FACTS.md) ← `registry/repo-facts.yaml`
- [Environment Variables](reference/ENVIRONMENT-VARIABLES.md) ← `registry/repo-facts.yaml`
- [Config Surface](reference/CONFIG-SURFACE.md) ← `registry/repo-facts.yaml`
- [Glossary](reference/GLOSSARY.md) ← `registry/ubiquitous-language.yaml`
- [Pipeline Presets](reference/PIPELINE-PRESETS.md) ← `registry/repo-facts.yaml`

Regenerate with: `npm run repo-facts:gen` / `npm run glossary:gen`

## Legacy CLI References (Historical)

These dated references are retained for archive/diffing use. The live
`cm` shell is intentionally smaller than this list.

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
- [Demo gallery index](demo/README.md) — promoted preview status and
  source docs
- [Examples index](user/EXAMPLES.md) — user-facing examples with status labels

## Conventions

- **User docs** (`docs/user/`): stable, undated entry points
- **Dev docs** (`docs/dev/`): dated filenames with `-YYYYMMDD` suffix
- **Reference docs** (`docs/reference/`): auto-generated, do not edit
