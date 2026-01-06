# TASK-012: Add Pre-Commit Hooks

**Type:** chore
**Priority:** High
**Estimated Effort:** 30 minutes
**Created:** 2026-01-06

## Objective

Add pre-commit hooks using Husky and lint-staged to prevent bad commits from entering the repo.

## Current State

- No pre-commit hooks
- Quality checks only run in CI or manually
- Bad code can be committed locally

## Acceptance Criteria

- [ ] Husky installed and configured
- [ ] lint-staged configured for staged files only
- [ ] Pre-commit runs: typecheck, lint, format
- [ ] Pre-push runs: full test suite
- [ ] Hooks are auto-installed on `npm install`

## Implementation

1. Install dependencies:
   ```bash
   npm install -D husky lint-staged
   ```

2. Initialize Husky:
   ```bash
   npx husky init
   ```

3. Create `.husky/pre-commit`:
   ```bash
   npx lint-staged
   ```

4. Create `.husky/pre-push`:
   ```bash
   npm run test:run
   ```

5. Add to `package.json`:
   ```json
   {
     "lint-staged": {
       "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
       "*.{json,md,yml}": ["prettier --write"]
     },
     "scripts": {
       "prepare": "husky"
     }
   }
   ```

## Files to Create/Modify

- `package.json` (add lint-staged config, prepare script)
- `.husky/pre-commit`
- `.husky/pre-push`

## Testing

```bash
# Test pre-commit
git add .
git commit -m "test"  # Should run lint-staged

# Test pre-push
git push  # Should run tests
```
