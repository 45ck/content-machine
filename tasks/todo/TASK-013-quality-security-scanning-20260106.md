# TASK-013: Add Security Scanning

**Type:** chore
**Priority:** Medium
**Estimated Effort:** 1 hour
**Created:** 2026-01-06

## Objective

Add automated security scanning for dependencies and code vulnerabilities.

## Current State

- No automated security scanning
- Dependencies may have known vulnerabilities
- No SBOM (Software Bill of Materials)

## Acceptance Criteria

- [ ] `npm audit` added to CI pipeline
- [ ] Dependabot configured for dependency updates
- [ ] CodeQL or similar static analysis in CI
- [ ] Security policy documented (SECURITY.md)

## Implementation

### 1. Add npm audit to CI

Update `.github/workflows/ci.yml`:
```yaml
- name: Security audit
  run: npm audit --audit-level=high
```

### 2. Add Dependabot

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### 3. Add CodeQL workflow

Create `.github/workflows/codeql.yml` for static analysis.

### 4. Create SECURITY.md

Document how to report vulnerabilities.

## Files to Create/Modify

- `.github/workflows/ci.yml`
- `.github/dependabot.yml`
- `.github/workflows/codeql.yml`
- `SECURITY.md`

## Testing

```bash
npm audit  # Should pass or show only low-severity issues
```
