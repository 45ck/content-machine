/**
 * Render template domain surface area.
 *
 * Split out of `src/domain/index.ts` to avoid eager loading template-related schemas
 * in callers that only need core artifact schemas (helps test mocks and reduces coupling).
 */

/** Render template schema + types. */
export * from '../render/templates/schema';
