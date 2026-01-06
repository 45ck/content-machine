/**
 * CLI Utilities
 *
 * Shared helpers for CLI commands.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { CMError, isCMError } from '../core/errors';
import { logger } from '../core/logger';
import { getCliRuntime } from './runtime';
import { formatCliErrorLines, getCliErrorInfo, getExitCodeForError } from './format';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from './output';

/**
 * Read and parse a JSON input file
 */
export async function readInputFile<T = unknown>(path: string): Promise<T> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CMError('FILE_NOT_FOUND', `File not found: ${path}`, {
        path,
        fix: `Check the path or re-run the producing command to create ${path}`,
      });
    }
    if (error instanceof SyntaxError) {
      throw new CMError('INVALID_JSON', `Invalid JSON in file: ${path}`, {
        path,
        fix: 'Ensure the file contains valid JSON.',
      });
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
  const runtime = getCliRuntime();
  const info = getCliErrorInfo(error);
  const exitCode = getExitCodeForError(info);

  if (runtime.json) {
    const envelope = buildJsonEnvelope({
      command: runtime.command ?? 'unknown',
      timingsMs: Date.now() - runtime.startTime,
      errors: [
        {
          code: info.code,
          message: info.message,
          context: info.context,
        },
      ],
    });
    writeJsonEnvelope(envelope);
    process.exit(exitCode);
  }

  for (const line of formatCliErrorLines(info)) {
    writeStderrLine(line);
  }

  if (isCMError(error)) {
    logger.error({ error, code: error.code }, 'Command failed');
  } else if (error instanceof Error && error.stack) {
    logger.error({ stack: error.stack }, 'Unexpected error');
  }

  process.exit(exitCode);
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
