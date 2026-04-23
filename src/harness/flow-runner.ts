import { join, resolve } from 'node:path';
import { z } from 'zod';
import { runDoctorReport, type DoctorReportRequest } from './doctor-report';
import { runGenerateShort, type GenerateShortRequest } from './generate-short';
import { loadFlowManifest } from './flow-manifest';
import { ingestReferenceVideo, type IngestRequest } from './ingest';
import {
  artifactDirectory,
  type HarnessArtifact,
  type HarnessToolContext,
  type HarnessToolResult,
} from './json-stdio';

type SupportedFlowInput = DoctorReportRequest | GenerateShortRequest | IngestRequest;

type FlowHandler = (
  input: SupportedFlowInput
) => Promise<HarnessToolResult<Record<string, unknown>> | HarnessToolResult<unknown>>;

const flowRegistry: Record<string, FlowHandler> = {
  'doctor-report': async (input) => runDoctorReport(input as DoctorReportRequest),
  'generate-short': async (input) => runGenerateShort(input as GenerateShortRequest),
  'reverse-engineer-winner': async (input) => ingestReferenceVideo(input as IngestRequest),
};

export const RunFlowRequestSchema = z
  .object({
    flow: z.string().min(1),
    flowsDir: z.string().min(1).default('flows'),
    runId: z.string().min(1).optional(),
    input: z.record(z.any()).default({}),
  })
  .strict();

export type RunFlowRequest = z.input<typeof RunFlowRequestSchema>;

function resolveDefaultOutputDir(template: string, runId: string): string {
  return resolve(template.replaceAll('{runId}', runId));
}

function dedupeArtifacts(artifacts: HarnessArtifact[]): HarnessArtifact[] {
  const unique = new Map<string, HarnessArtifact>();
  for (const artifact of artifacts) {
    unique.set(`${artifact.kind}:${artifact.path}`, artifact);
  }
  return [...unique.values()];
}

/** Load a `.flow` manifest, bind its default output path, and execute its entry skill. */
export async function runFlowFromManifest(request: RunFlowRequest): Promise<
  HarnessToolResult<{
    flow: string;
    manifestPath: string;
    entrySkill: string;
    runId: string | null;
    outputDir: string | null;
    result: unknown;
  }>
> {
  const normalized = RunFlowRequestSchema.parse(request);
  const manifestPath = normalized.flow.endsWith('.flow')
    ? resolve(normalized.flow)
    : resolve(join(normalized.flowsDir, `${normalized.flow}.flow`));
  const manifest = await loadFlowManifest(manifestPath);
  const handler = flowRegistry[manifest.entrySkill];

  if (!handler) {
    const error = new Error(`No flow handler registered for entry skill "${manifest.entrySkill}"`);
    (error as Error & { code: string }).code = 'UNSUPPORTED_FLOW_SKILL';
    throw error;
  }

  const runId = normalized.runId ?? null;
  const boundInput = { ...normalized.input };
  const outputDir =
    typeof boundInput.outputDir === 'string'
      ? resolve(boundInput.outputDir)
      : manifest.defaultOutputDir && runId
        ? resolveDefaultOutputDir(manifest.defaultOutputDir, runId)
        : null;

  if (outputDir && !('outputDir' in boundInput)) {
    boundInput.outputDir = outputDir;
  }

  const handled = await handler(boundInput as SupportedFlowInput);
  const artifacts = dedupeArtifacts([
    ...(outputDir ? [artifactDirectory(outputDir, 'Flow output directory')] : []),
    ...(handled.artifacts ?? []),
  ]);

  return {
    result: {
      flow: manifest.name,
      manifestPath,
      entrySkill: manifest.entrySkill,
      runId,
      outputDir,
      result: handled.result,
    },
    artifacts,
    warnings: handled.warnings,
  };
}

/** Harness-tool adapter for executing a named repo-local flow manifest. */
export async function runFlowHandler({ input }: HarnessToolContext<RunFlowRequest>): Promise<
  HarnessToolResult<{
    flow: string;
    manifestPath: string;
    entrySkill: string;
    runId: string | null;
    outputDir: string | null;
    result: unknown;
  }>
> {
  return runFlowFromManifest(input);
}
