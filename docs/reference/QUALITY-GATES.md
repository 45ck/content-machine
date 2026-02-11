# Quality Gates

> DO NOT EDIT: generated from `docs/reference/repo-facts.yaml`.

These checks must remain wired in CI and are expected to be runnable locally.

Required npm scripts:

- `npm run glossary:check`
- `npm run repo-facts:check`
- `npm run cspell:check`
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run test:coverage:push`
- `npm run dup:check`
- `npm run size:check`

CI workflow: `.github/workflows/ci.yml`
