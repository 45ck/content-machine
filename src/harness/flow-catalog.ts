import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { artifactDirectory, type HarnessToolResult } from './json-stdio';
import { loadFlowManifest } from './flow-manifest';

export const FlowCatalogRequestSchema = z
  .object({
    flowsDir: z.string().min(1).default('flows'),
  })
  .strict();

export type FlowCatalogRequest = z.input<typeof FlowCatalogRequestSchema>;

/** Enumerate executable flow manifests for harness-side discovery. */
export async function listFlowCatalog(request: FlowCatalogRequest): Promise<
  HarnessToolResult<{
    flowsDir: string;
    flowCount: number;
    flows: Array<{
      name: string;
      description: string;
      entrySkill: string;
      manifestPath: string;
      operatorNotesPath: string | null;
      defaultOutputDir: string | null;
      inputs: Array<{ name: string; description: string; required: boolean }>;
      outputs: Array<{ name: string; description: string; required: boolean }>;
    }>;
  }>
> {
  const normalized = FlowCatalogRequestSchema.parse(request);
  const flowsDir = resolve(normalized.flowsDir);
  const entries = await readdir(flowsDir, { withFileTypes: true });

  const flows = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.flow'))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const manifestPath = join(flowsDir, entry.name);
        const manifest = await loadFlowManifest(manifestPath);
        return {
          name: manifest.name,
          description: manifest.description,
          entrySkill: manifest.entrySkill,
          manifestPath,
          operatorNotesPath: manifest.operatorNotes ? resolve(manifest.operatorNotes) : null,
          defaultOutputDir: manifest.defaultOutputDir ?? null,
          inputs: manifest.inputs,
          outputs: manifest.outputs,
        };
      })
  );

  return {
    result: {
      flowsDir,
      flowCount: flows.length,
      flows,
    },
    artifacts: [artifactDirectory(flowsDir, 'Flow catalog root directory')],
  };
}
