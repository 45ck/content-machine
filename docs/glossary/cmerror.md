# cmerror

`CMError` is the base error contract for content-machine, carrying a stable machine-readable `code` plus structured `context`.

## Data layer meaning

- `code` is stable for automation.
- `context` contains structured fields that make failures diagnosable without parsing messages.
- `cause` preserves underlying errors when wrapping.

## Code references

- `src/core/errors.ts` (`CMError`, `SchemaError`, `RateLimitError`)

## Related

- `docs/glossary/error-code.md`
- `docs/glossary/retryable.md`
