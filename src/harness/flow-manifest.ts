import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const FlowFieldSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    required: z.boolean(),
  })
  .strict();

export const FlowManifestSchema = z
  .object({
    name: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().min(1).max(1024),
    entrySkill: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    operatorNotes: z.string().min(1).optional(),
    defaultOutputDir: z.string().min(1).optional(),
    inputs: z.array(FlowFieldSchema).default([]),
    outputs: z.array(FlowFieldSchema).default([]),
  })
  .strict();

export type FlowManifest = z.infer<typeof FlowManifestSchema>;

/** Parse and validate a repo-local `.flow` manifest. */
export function parseFlowManifest(manifestSource: string): FlowManifest {
  const parsed = parseYaml(manifestSource) as unknown;
  return FlowManifestSchema.parse(parsed);
}

/** Load a `.flow` manifest from disk. */
export async function loadFlowManifest(path: string): Promise<FlowManifest> {
  const manifestSource = await readFile(path, 'utf8');
  return parseFlowManifest(manifestSource);
}
