import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import type { FeedbackEntry } from '../domain';
import { FeedbackEntrySchema } from '../domain';

export function defaultFeedbackStorePath(): string {
  const override = process.env.CM_FEEDBACK_STORE_PATH;
  if (override && override.trim()) {
    return resolve(override.trim());
  }
  return join(homedir(), '.cm', 'feedback', 'feedback.jsonl');
}

function isProbablyJson(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

export async function appendFeedbackEntry(path: string, entry: FeedbackEntry): Promise<void> {
  const parsed = FeedbackEntrySchema.safeParse(entry);
  if (!parsed.success) {
    throw new Error(`Invalid feedback entry: ${parsed.error.message}`);
  }

  await mkdir(dirname(path), { recursive: true });
  const line = `${JSON.stringify(parsed.data)}\n`;
  await writeFile(path, line, { encoding: 'utf-8', flag: 'a' });
}

export async function readFeedbackEntries(path: string): Promise<FeedbackEntry[]> {
  try {
    const content = await readFile(path, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    const entries: FeedbackEntry[] = [];

    for (const line of lines) {
      if (!isProbablyJson(line)) continue;
      try {
        const raw = JSON.parse(line) as unknown;
        const parsed = FeedbackEntrySchema.safeParse(raw);
        if (parsed.success) {
          entries.push(parsed.data);
        }
      } catch {
        // Ignore malformed lines (append-only log).
      }
    }

    return entries;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return [];
    throw error;
  }
}

export async function writeFeedbackExportFile(params: {
  path: string;
  exportedAt: string;
  entries: FeedbackEntry[];
}): Promise<void> {
  await mkdir(dirname(params.path), { recursive: true });
  const payload = {
    schemaVersion: 1,
    exportedAt: params.exportedAt,
    count: params.entries.length,
    entries: params.entries,
  };
  await writeFile(params.path, JSON.stringify(payload, null, 2), 'utf-8');
}
