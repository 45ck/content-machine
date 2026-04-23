#!/usr/bin/env node
import { runHarnessTool } from '../../src/harness/json-stdio.ts';
import { DoctorReportRequestSchema, runDoctorReport } from '../../src/harness/doctor-report.ts';

await runHarnessTool({
  tool: 'content-machine/doctor-report',
  inputSchema: DoctorReportRequestSchema,
  handler: async ({ input }) => runDoctorReport(input),
});
