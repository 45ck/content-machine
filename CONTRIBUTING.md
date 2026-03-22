# Contributing

Thanks for your interest in Content Machine! Here's how to get started.

## Your First Contribution

New here? Look for issues labeled [`good first issue`](https://github.com/45ck/content-machine/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). These are scoped, well-described, and a great way to learn the codebase.

Not sure where to start? Some areas that always welcome help:

- Improving user docs in `docs/user/`
- Adding example scripts to `docs/user/examples/`
- Writing tests for uncovered code paths
- Bug fixes (check open issues)

## Setup

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine

nvm install && nvm use   # or ensure Node.js >= 20
npm install
cp .env.example .env     # add API keys as needed

npm run cm -- --help     # verify it works
```

## Development Workflow

1. Create a branch: `git checkout -b my-feature`
2. Make your changes
3. Run checks: `npm run quality` (runs typecheck, lint, format, tests, duplication)
4. Commit and open a PR

### Running Checks Individually

```bash
npm run typecheck      # TypeScript
npm run lint:fix       # ESLint (auto-fix)
npm run format         # Prettier
npm test               # Vitest (watch mode)
npm run test:run       # Vitest (single run)
npm run test:coverage  # With coverage report
```

### Writing Tests

We use [Vitest](https://vitest.dev/) with test fakes in `src/test/stubs/`:

```typescript
import { FakeLLMProvider } from '@/test/stubs/fake-llm.js';

const fakeLLM = new FakeLLMProvider();
fakeLLM.queueJsonResponse({ script: '...' });
```

We recommend writing tests alongside your changes. For bug fixes, a regression test is appreciated.

## Pull Requests

Before submitting:

- [ ] `npm run quality` passes
- [ ] No hardcoded secrets
- [ ] New code has test coverage
- [ ] Docs updated if behavior changed

Keep PRs focused — one feature or fix per PR. We'll review within a few days.

## Code Style

- TypeScript with strict mode
- camelCase for variables/functions, PascalCase for types, kebab-case for files
- Structured logging via Pino (`createLogger('module-name')`)
- Errors use types from `src/core/errors.ts`

## Documentation

- User docs live in `docs/user/` — keep these approachable
- Developer docs live in `docs/dev/` — dated filenames use `YYYYMMDD` suffix convention
- Reference docs in `docs/reference/` are auto-generated — edit the YAML registries instead:
  - `registry/repo-facts.yaml` → `npm run repo-facts:gen`
  - `registry/ubiquitous-language.yaml` → `npm run glossary:gen`

## Getting Help

- **Questions**: [open an issue](https://github.com/45ck/content-machine/issues) with `[question]` in the title
- **Bugs**: include the command you ran, expected vs actual behavior, and `--verbose` output
- **Security**: see [SECURITY.md](SECURITY.md) — do not use public issues for security reports

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
