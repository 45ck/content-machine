/**
 * Logger for content-machine
 * 
 * Uses pino for structured logging with pretty output in development.
 */
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;

// Determine log level
const level = process.env.LOG_LEVEL ?? (isTest ? 'silent' : isDev ? 'debug' : 'info');

// Create logger instance
export const logger = pino({
  level,
  transport: isDev && !isTest
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

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
