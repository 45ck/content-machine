/**
 * Logger for content-machine
 *
 * Uses pino for structured logging.
 *
 * Design constraints:
 * - Always write to stderr (stdout reserved for primary artifacts / JSON envelopes).
 * - Avoid worker-thread transports (can delay process exit under load).
 * - Work in both ESM (tsx/dev) and bundled CJS (dist/cli/index.cjs).
 */
import pino from 'pino';
import pretty from 'pino-pretty';

export type Logger = pino.Logger;

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;
const isDev = process.env.NODE_ENV !== 'production';

// Determine log level
const level = process.env.LOG_LEVEL ?? (isTest ? 'silent' : isDev ? 'debug' : 'info');

function createLogStream(): pino.DestinationStream {
  const shouldPretty = !isTest && Boolean(process.stderr.isTTY);
  if (shouldPretty) {
    return pretty({
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      destination: 2,
      sync: true,
    });
  }

  return pino.destination({ dest: 2, sync: true });
}

// Create logger instance (stderr-only; safe for process.exit)
export const logger = pino({ level }, createLogStream());

/**
 * Create a child logger with context
 */
export function createLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}

/**
 * Log execution time of an async function
 */
export async function logTiming<T>(
  name: string,
  fn: () => Promise<T>,
  log: pino.Logger = logger
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    log.info({ duration: `${duration.toFixed(2)}ms` }, `${name} completed`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    log.error({ duration: `${duration.toFixed(2)}ms`, error }, `${name} failed`);
    throw error;
  }
}
