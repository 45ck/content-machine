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

## Examples

```bash
npm run quality
```

## Troubleshooting

- **Symptom:** Lint reports warnings.
  - **Fix:** Fix the warning or update the rule, then rerun `npm run quality`.
- **Symptom:** Tests fail with missing artifacts.
  - **Fix:** Ensure required fixtures exist or run in the same environment as CI.
- **Symptom:** Duplication check fails.
  - **Fix:** Refactor duplicate blocks or update the jscpd config with justification.

## Related

- `package.json`
- `docs/architecture/SYSTEM-DESIGN-20260104.md`
