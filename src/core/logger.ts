/**
 * Logger for content-machine
 *
 * Uses pino for structured logging with pretty output in development.
 */
import pino from 'pino';
import { createRequire } from 'module';

export type Logger = pino.Logger;

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;

// Determine log level
const level = process.env.LOG_LEVEL ?? (isTest ? 'silent' : 'warn');

const require = createRequire(import.meta.url);

function createLogStream(): pino.DestinationStream {
  const shouldPretty = !isTest && Boolean(process.stderr.isTTY);
  if (shouldPretty) {
    const loaded = require('pino-pretty') as unknown;
    const prettyFactory =
      typeof loaded === 'function'
        ? (loaded as (options: Record<string, unknown>) => pino.DestinationStream)
        : ((loaded as { default?: unknown }).default as (
            options: Record<string, unknown>
          ) => pino.DestinationStream);

    return prettyFactory({
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      destination: 2,
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
