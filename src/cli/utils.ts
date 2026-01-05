/**
 * CLI Utilities
 *
 * Shared helpers for CLI commands.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import chalk from 'chalk';
import { isCMError, isRetryable } from '../core/errors';
import { logger } from '../core/logger';

/**
 * Read and parse a JSON input file
 */
export async function readInputFile<T = unknown>(path: string): Promise<T> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(chalk.red(`\n❌ File not found: ${path}\n`));
      process.exit(1);
    }
    if (error instanceof SyntaxError) {
      console.error(chalk.red(`\n❌ Invalid JSON in file: ${path}\n`));
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Write JSON output to a file
 */
export async function writeOutputFile(path: string, data: unknown): Promise<void> {
  // Ensure directory exists
  await mkdir(dirname(path), { recursive: true });

  // Write JSON with pretty formatting
  const content = JSON.stringify(data, null, 2);
  await writeFile(path, content, 'utf-8');
}

/**
 * Handle command errors with user-friendly output
 */
export function handleCommandError(error: unknown): never {
  if (isCMError(error)) {
    // Known error with context
    console.error(chalk.red(`\n❌ ${error.message}\n`));

    if (error.context) {
      console.error(chalk.gray('Context:'));
      for (const [key, value] of Object.entries(error.context)) {
        console.error(chalk.gray(`  ${key}: ${JSON.stringify(value)}`));
      }
      console.error('');
    }

    if (isRetryable(error)) {
      console.error(chalk.yellow('💡 This error may be temporary. Try again in a few moments.\n'));
    }

    logger.error({ error, code: error.code }, 'Command failed');
    process.exit(1);
  }

  // Unknown error
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`\n❌ Unexpected error: ${message}\n`));

  if (error instanceof Error && error.stack) {
    logger.error({ stack: error.stack }, 'Unexpected error');
  }

  process.exit(1);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
