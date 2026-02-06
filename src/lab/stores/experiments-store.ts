import { randomUUID } from 'node:crypto';
import type { LabExperiment } from '../../domain';
import { LabExperimentSchema } from '../../domain';
import { appendJsonl, lastById, readJsonl } from './jsonl';

export function generateExperimentId(): string {
  return `exp_${randomUUID()}`;
}

export function generateVariantId(): string {
  return `var_${randomUUID()}`;
}

export async function readExperiments(storePath: string): Promise<LabExperiment[]> {
  const items = await readJsonl({ path: storePath, schema: LabExperimentSchema });
  return lastById(items, 'experimentId');
}

export async function appendExperiment(
  storePath: string,
  experiment: LabExperiment
): Promise<LabExperiment> {
  return appendJsonl({ path: storePath, value: experiment, schema: LabExperimentSchema });
}
