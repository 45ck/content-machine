# TASK-017: Add Error Boundary and Edge Case Tests

**Type:** test
**Priority:** Medium
**Estimated Effort:** 3 hours
**Created:** 2026-01-06

## Objective

Add comprehensive error handling tests for all pipeline stages and edge cases.

## Current State

- Happy path tests exist
- Limited error scenario testing
- No tests for API failures, timeouts, malformed responses

## Acceptance Criteria

- [ ] LLM provider tests: rate limits, invalid responses, network errors
- [ ] TTS provider tests: audio generation failures
- [ ] ASR provider tests: transcription failures
- [ ] Pexels provider tests: no results, API errors
- [ ] Pipeline tests: partial failures, recovery

## Test Scenarios to Add

### LLM Provider

- [ ] Rate limit (429) handling and retry
- [ ] Invalid JSON response
- [ ] Empty response
- [ ] Network timeout
- [ ] Authentication error (401)

### Pipeline

- [ ] Script stage failure → graceful exit
- [ ] Audio stage failure → cleanup artifacts
- [ ] Visuals stage failure → fallback to placeholder
- [ ] Render stage failure → preserve intermediate files

### Input Validation

- [ ] Empty topic
- [ ] Very long topic (>1000 chars)
- [ ] Special characters in topic
- [ ] Invalid archetype
- [ ] Invalid orientation

## Files to Create

- `tests/unit/core/llm/error-handling.test.ts`
- `tests/unit/pipeline/error-recovery.test.ts`
- `tests/unit/validation/input-edge-cases.test.ts`

## Testing

```bash
npm run test:coverage -- --grep "error|edge|failure"
```
