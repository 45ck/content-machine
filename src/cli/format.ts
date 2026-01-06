import { isCMError, isRetryable } from '../core/errors';

export interface CliErrorInfo {
  code: string;
  message: string;
  fix?: string;
  context?: Record<string, unknown>;
  retryable?: boolean;
}

export function getCliErrorInfo(error: unknown): CliErrorInfo {
  if (isCMError(error)) {
    const fix =
      error.context && typeof error.context.fix === 'string' ? error.context.fix : undefined;
    return {
      code: error.code,
      message: error.message,
      fix,
      context: error.context,
      retryable: isRetryable(error),
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
  };
}

export function formatCliErrorLines(info: CliErrorInfo): string[] {
  const lines: string[] = [`ERROR: ${info.message}`];

  if (info.fix) {
    lines.push(`Fix: ${info.fix}`);
  }

  if (info.context && Object.keys(info.context).length > 0) {
    lines.push('Context:');
    for (const [key, value] of Object.entries(info.context)) {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    }
  }

  if (info.retryable) {
    lines.push('WARN: This error may be temporary. Try again in a few moments.');
  }

  return lines;
}

export function getExitCodeForError(info: CliErrorInfo): number {
  const usageCodes = new Set([
    'INVALID_ARGUMENT',
    'SCHEMA_ERROR',
    'FILE_NOT_FOUND',
    'INVALID_JSON',
  ]);
  return usageCodes.has(info.code) ? 2 : 1;
}
