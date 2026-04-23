import { resolve } from 'node:path';
import { z } from 'zod';
import { runDoctor } from '../core/doctor';
import { writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';

export const DoctorReportRequestSchema = z
  .object({
    strict: z.boolean().default(false),
    outputPath: z.string().min(1).default('output/harness/doctor/doctor.json'),
  })
  .strict();

export type DoctorReportRequest = z.input<typeof DoctorReportRequestSchema>;

/** Run the core doctor checks and persist the structured report as an artifact. */
export async function runDoctorReport(request: DoctorReportRequest): Promise<
  HarnessToolResult<{
    outputPath: string;
    ok: boolean;
    strict: boolean;
    checks: number;
    failures: number;
    warnings: number;
  }>
> {
  const normalized = DoctorReportRequestSchema.parse(request);
  const outputPath = resolve(normalized.outputPath);
  const report = await runDoctor({ strict: normalized.strict });

  await writeJsonArtifact(outputPath, report);

  return {
    result: {
      outputPath,
      ok: report.ok,
      strict: report.strict,
      checks: report.checks.length,
      failures: report.checks.filter((check) => check.status === 'fail').length,
      warnings: report.checks.filter((check) => check.status === 'warn').length,
    },
    artifacts: [artifactFile(outputPath, 'Doctor report artifact')],
  };
}
