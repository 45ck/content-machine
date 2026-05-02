# Quality Gates

> DO NOT EDIT: generated from `registry/repo-facts.yaml`.

These checks are local-first and expected to be runnable in this checkout.

Required npm scripts:

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run test:run`
- `npm run docs:check`
- `npm run public-demo:check`
- `npm run cspell:check`
- `npm run repo-facts:check`
- `npm run glossary:check`

Documentation validation:

Checked markdown paths:

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/README.md`
- `docs/demo/README.md`
- `docs/demo/provenance/*.md`
- `docs/dev/*.md`
- `docs/reference/*.md`
- `docs/user/*.md`
- `docs/user/*/*.md`

Linkcheck ignore globs:

- `docs/reference/NANOBANANA-PROMPT-ENGINEERING-20260107.md`
