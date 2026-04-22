import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { ZodError, z, type ZodTypeAny } from 'zod';

/** Write a JSON artifact to disk, creating parent directories as needed. */
export async function writeJsonArtifact(path: string, data: unknown): Promise<string> {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, JSON.stringify(data, null, 2), 'utf8');
  return resolved;
}

/** Read and validate a JSON artifact using the provided schema. */
export async function readJsonArtifact<TSchema extends ZodTypeAny>(
  path: string,
  schema: TSchema,
  label: string
): Promise<z.output<TSchema>> {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  try {
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      const wrapped = new Error(`Invalid ${label}: ${resolved}`) as Error & {
        code?: string;
        details?: unknown;
      };
      wrapped.code = 'INVALID_ARTIFACT';
      wrapped.details = { path: resolved, issues: error.flatten() };
      throw wrapped;
    }
    throw error;
  }
}
