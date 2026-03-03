# guide-quality-gates-20260111

Define the strict success criteria for code health in this repo and how to verify it.

## When to use this

- You want a single pass/fail gate before merging or releasing.
- You need to keep lint warnings at zero and detect duplication regressions.

## Prerequisites

- Node.js >= 20
- Dependencies installed (`npm install`)

## Steps

1. Run the strict quality gate:
   - `npm run quality`
2. Confirm the exit code is 0.
3. (Optional, slower) Run mutation testing:
   - `npm run mutation`
4. (Optional, slowest) Run the full suite:
   - `npm run quality:full`

## Examples

```bash
npm run quality
npm run mutation
npm run quality:full
```

## Troubleshooting

- **Symptom:** Lint reports warnings.
  - **Fix:** Fix the warning or update the rule, then rerun `npm run quality`.
- **Symptom:** Tests fail with missing artifacts.
  - **Fix:** Ensure required fixtures exist or run in the same environment as CI.
- **Symptom:** Duplication check fails.
  - **Fix:** Refactor duplicate blocks or update the jscpd config with justification.
- **Symptom:** Mutation score is below the break threshold.
  - **Fix:** Add/strengthen unit tests for the mutated module(s), then rerun `npm run mutation`.

## Related

- `package.json`
- `stryker.conf.json`
- `docs/dev/architecture/SYSTEM-DESIGN-20260104.md`
