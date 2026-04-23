# TASK-010: Enable Strict Quality Mode

**Type:** chore
**Priority:** High
**Estimated Effort:** 1 hour
**Created:** 2026-01-06

## Objective

Convert all ESLint warnings to errors and enable TypeScript strict unused checks for zero-tolerance quality gates.

## Current State

- ESLint has several rules set to `warn` instead of `error`
- TypeScript has `noUnusedLocals: false` and `noUnusedParameters: false`
- Quality passes but warnings are allowed

## Acceptance Criteria

- [ ] All ESLint warnings converted to errors in `eslint.config.js`
- [ ] `noUnusedLocals: true` in tsconfig.json
- [ ] `noUnusedParameters: true` in tsconfig.json
- [ ] `noImplicitReturns: true` in tsconfig.json
- [ ] `noImplicitOverride: true` in tsconfig.json
- [ ] All quality checks still pass with 0 errors
- [ ] CI workflow updated if needed

## Implementation

1. Update `eslint.config.js`:
   - `@typescript-eslint/no-unused-vars`: warn → error
   - `max-params`: warn → error
   - `max-lines-per-function`: warn → error
   - `sonarjs/no-duplicate-string`: warn → error
   - `sonarjs/no-identical-functions`: warn → error

2. Update `tsconfig.json`:
   - `noUnusedLocals`: false → true
   - `noUnusedParameters`: false → true
   - Add `noImplicitReturns: true`
   - Add `noImplicitOverride: true`

3. Fix any new errors that surface

4. Run `npm run quality` to verify

## Files to Modify

- `eslint.config.js`
- `tsconfig.json`
- Any source files with new errors

## Testing

```bash
npm run quality  # Must exit 0 with no warnings
```
