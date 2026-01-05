/**
 * Error Taxonomy for content-machine
 * 
 * All errors extend CMError with:
 * - Unique error codes
 * - Structured context
 * - Cause chaining
 * - Retryability detection
 */

export interface ErrorContext {
  [key: string]: unknown;
}

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
}

/**
 * Base error class for all content-machine errors
 */
export class CMError extends Error {
  readonly code: string;
  readonly context?: ErrorContext;

  constructor(
    code: string,
    message: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message);
    this.name = 'CMError';
    this.code = code;
    this.context = context;
    this.cause = cause;
    
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Configuration errors (missing keys, invalid values)
 */
export class ConfigError extends CMError {
  constructor(message: string, context?: ErrorContext) {
    super('CONFIG_ERROR', message, context);
    this.name = 'ConfigError';
  }
}

/**
 * API errors from external services
 */
export class APIError extends CMError {
  readonly provider?: string;
  readonly status?: number;

  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super('API_ERROR', message, context, cause);
    this.name = 'APIError';
    this.provider = context?.provider as string | undefined;
    this.status = context?.status as number | undefined;
  }
}

/**
 * Rate limit errors with retry guidance
 */
export class RateLimitError extends CMError {
  readonly provider: string;
  readonly retryAfter: number;

  constructor(provider: string, retryAfter: number) {
    super(
      'RATE_LIMIT',
      `Rate limited by ${provider}. Retry after ${retryAfter} seconds.`,
      { provider, retryAfter }
    );
    this.name = 'RateLimitError';
    this.provider = provider;
    this.retryAfter = retryAfter;
  }
}

/**
 * Schema validation errors
 */
export class SchemaError extends CMError {
  readonly issues?: ValidationIssue[];

  constructor(message: string, context?: ErrorContext) {
    super('SCHEMA_ERROR', message, context);
    this.name = 'SchemaError';
    if (context?.issues) {
      this.issues = context.issues as ValidationIssue[];
    }
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends CMError {
  readonly resource?: string;
  readonly identifier?: string;

  constructor(message: string, context?: ErrorContext) {
    super('NOT_FOUND', message, context);
    this.name = 'NotFoundError';
    this.resource = context?.resource as string | undefined;
    this.identifier = context?.identifier as string | undefined;
  }
}

/**
 * Video rendering errors
 */
export class RenderError extends CMError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super('RENDER_ERROR', message, context, cause);
    this.name = 'RenderError';
  }
}

/**
 * Pipeline stage errors
 */
export class PipelineError extends CMError {
  readonly stage: string;

  constructor(stage: string, message: string, cause?: Error) {
    super('PIPELINE_ERROR', message, { stage }, cause);
    this.name = 'PipelineError';
    this.stage = stage;
  }
}

/**
 * Type guard to check if error is a CMError
 */
export function isCMError(error: unknown): error is CMError {
  return error instanceof CMError;
}

/**
 * Determine if an error should trigger a retry
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }
  
  if (error instanceof APIError) {
    // 429 (rate limit) or 5xx (server errors) are retryable
    if (error.status === 429) return true;
    if (error.status && error.status >= 500 && error.status < 600) return true;
  }
  
  return false;
}

/**
 * Wrap an unknown error as a CMError
 */
export function wrapError(error: unknown, defaultCode: string = 'UNKNOWN_ERROR'): CMError {
  if (isCMError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new CMError(defaultCode, error.message, undefined, error);
  }
  
  return new CMError(defaultCode, String(error));
}
