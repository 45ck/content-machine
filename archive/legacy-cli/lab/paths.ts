import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export function labRootDir(): string {
  const override = process.env.CM_LAB_ROOT;
  if (override && override.trim()) {
    return resolve(override.trim());
  }
  return join(homedir(), '.cm', 'lab');
}

export function labRunsStorePath(): string {
  return join(labRootDir(), 'runs.jsonl');
}

export function labExperimentsStorePath(): string {
  return join(labRootDir(), 'experiments.jsonl');
}

export function labExportsDir(): string {
  return join(labRootDir(), 'exports');
}

export function labSessionsDir(): string {
  return join(labRootDir(), 'sessions');
}

export function labSessionDir(sessionId: string): string {
  return join(labSessionsDir(), sessionId);
}

export function labSessionIdempotencyStorePath(sessionId: string): string {
  return join(labSessionDir(sessionId), 'idempotency.jsonl');
}
