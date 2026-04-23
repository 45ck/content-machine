# TASK-014: Add Bundle Size Checking

**Type:** chore
**Priority:** Low
**Estimated Effort:** 1 hour
**Created:** 2026-01-06

## Objective

Track and limit CLI bundle size to prevent bloat and slow installs.

## Current State

- No bundle size tracking
- No limits on dependency size
- Unknown impact of new dependencies

## Acceptance Criteria

- [ ] Bundle size tracked in CI
- [ ] Size limit configured (e.g., 5MB for CLI)
- [ ] Size regression warnings on PRs
- [ ] Current baseline documented

## Implementation

### 1. Install size-limit

```bash
npm install -D size-limit @size-limit/file
```

### 2. Configure in package.json

```json
{
  "size-limit": [
    {
      "path": "dist/cli/index.cjs",
      "limit": "5 MB"
    }
  ],
  "scripts": {
    "size": "size-limit",
    "size:check": "size-limit --json"
  }
}
```

### 3. Add to CI

```yaml
- name: Build
  run: npm run build

- name: Check bundle size
  run: npm run size
```

## Files to Modify

- `package.json`
- `.github/workflows/ci.yml`

## Testing

```bash
npm run build
npm run size  # Should show bundle size and pass limit
```
