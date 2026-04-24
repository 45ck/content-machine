import { resolve } from 'node:path';
import { z } from 'zod';
import { StyleProfileLibrarySchema, StyleProfileSchema } from '../domain';
import { upsertStyleProfile } from '../library';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';

export const StyleProfileLibraryRequestSchema = z
  .object({
    libraryPath: z.string().min(1).default('output/content-machine/library/style-profiles.v1.json'),
    profile: StyleProfileSchema,
    existingLibraryPath: z.string().min(1).optional(),
  })
  .strict();

export type StyleProfileLibraryRequest = z.input<typeof StyleProfileLibraryRequestSchema>;

export async function runStyleProfileLibrary(request: StyleProfileLibraryRequest): Promise<
  HarnessToolResult<{
    outputPath: string;
    profileCount: number;
  }>
> {
  const normalized = StyleProfileLibraryRequestSchema.parse(request);
  const outputPath = resolve(normalized.libraryPath);
  const existing = normalized.existingLibraryPath
    ? await readJsonArtifact(
        resolve(normalized.existingLibraryPath),
        StyleProfileLibrarySchema,
        'style profile library'
      )
    : null;
  const library = upsertStyleProfile(normalized.profile, existing);

  await writeJsonArtifact(outputPath, library);

  return {
    result: {
      outputPath,
      profileCount: library.profiles.length,
    },
    artifacts: [artifactFile(outputPath, 'Style profile library artifact')],
    warnings: library.warnings,
  };
}
