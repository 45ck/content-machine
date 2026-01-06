# TASK-015: Add API Documentation Generation

**Type:** docs
**Priority:** Low
**Estimated Effort:** 2 hours
**Created:** 2026-01-06

## Objective

Auto-generate API documentation from TypeScript source using TypeDoc.

## Current State

- No auto-generated API docs
- Only manual markdown documentation
- TSDoc comments exist but not compiled

## Acceptance Criteria

- [ ] TypeDoc configured and generating docs
- [ ] Docs generated on build
- [ ] Docs published to GitHub Pages (optional)
- [ ] CI validates docs can be generated

## Implementation

### 1. Install TypeDoc

```bash
npm install -D typedoc
```

### 2. Configure typedoc.json

```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "exclude": ["**/*.test.ts", "**/vendor/**"],
  "excludePrivate": true,
  "excludeInternal": true
}
```

### 3. Add npm scripts

```json
{
  "scripts": {
    "docs": "typedoc",
    "docs:serve": "typedoc --watch"
  }
}
```

### 4. Add to CI (optional)

```yaml
- name: Generate docs
  run: npm run docs
```

## Files to Create/Modify

- `package.json`
- `typedoc.json`
- `.github/workflows/ci.yml` (optional)

## Testing

```bash
npm run docs  # Should generate docs/api/
```
