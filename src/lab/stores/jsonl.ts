import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { z } from 'zod';

function isProbablyJson(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

export async function appendJsonl<T>(params: {
  path: string;
  value: unknown;
  schema: z.ZodType<T, any, unknown>;
}): Promise<T> {
  const parsed = params.schema.safeParse(params.value);
  if (!parsed.success) {
    throw new Error(`Invalid JSONL value: ${parsed.error.message}`);
  }

  await mkdir(dirname(params.path), { recursive: true });
  await writeFile(params.path, `${JSON.stringify(parsed.data)}\n`, {
    encoding: 'utf-8',
    flag: 'a',
  });
  return parsed.data;
}

export async function readJsonl<T>(params: {
  path: string;
  schema: z.ZodType<T, any, unknown>;
}): Promise<T[]> {
  try {
    const content = await readFile(params.path, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    const items: T[] = [];

    for (const line of lines) {
      if (!isProbablyJson(line)) continue;
      try {
        const raw = JSON.parse(line) as unknown;
        const parsed = params.schema.safeParse(raw);
        if (parsed.success) items.push(parsed.data);
      } catch {
        // ignore malformed lines
      }
    }

    return items;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return [];
    throw error;
  }
}

export function lastById<T extends Record<string, unknown>>(items: T[], idKey: keyof T): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const id = String(item[idKey] ?? '');
    if (!id) continue;
    map.set(id, item);
  }
  return Array.from(map.values());
}
