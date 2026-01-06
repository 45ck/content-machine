# TASK-011: Increase Test Coverage Thresholds

**Type:** chore
**Priority:** Medium
**Estimated Effort:** 4-8 hours
**Created:** 2026-01-06

## Objective

Progressively increase test coverage thresholds from current baseline to production-ready levels.

## Current State

| Metric | Current Threshold | Current Actual | Target |
|--------|-------------------|----------------|--------|
| Lines | 18% | ~29% | 70% |
| Functions | 55% | ~64% | 80% |
| Statements | 18% | ~29% | 70% |
| Branches | 50% | ~72% | 70% |

## Acceptance Criteria

### Phase 1 (This Task)
- [ ] Raise thresholds to match current actuals (ratchet up)
- [ ] Lines: 18% → 25%
- [ ] Functions: 55% → 60%
- [ ] Statements: 18% → 25%
- [ ] Branches: 50% → 65%

### Phase 2 (Future Task)
- [ ] Add tests for uncovered CLI commands
- [ ] Add tests for core/pipeline.ts
- [ ] Add tests for LLM providers
- [ ] Target 70% across the board

## Implementation

1. Update `vitest.config.ts` thresholds
2. Identify largest coverage gaps:
   - `src/cli/commands/*.ts` (0% coverage)
   - `src/core/pipeline.ts` (0% coverage)
   - `src/core/llm/*.ts` (0% coverage)
   - `src/visuals/matcher.ts` (0% coverage)

3. Add unit tests for highest-impact files first

## Priority Test Files to Add

1. `src/cli/commands/generate.test.ts`
2. `src/core/pipeline.test.ts`
3. `src/core/llm/openai.test.ts`
4. `src/visuals/matcher.test.ts`

## Files to Modify

- `vitest.config.ts`
- New test files in `tests/unit/`

## Testing

```bash
npm run test:coverage  # Verify thresholds met
```
