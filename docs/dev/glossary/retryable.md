# retryable

An error is **retryable** if the caller can safely retry the operation after a delay without changing inputs.

## Current implementation

`isRetryable(error)` returns true for:

- `RateLimitError`
- `APIError` with HTTP 429 or 5xx

## Code references

- `src/core/errors.ts` (`isRetryable`, `RateLimitError`, `APIError`)

## Related

- `docs/dev/glossary/cmerror.md`
