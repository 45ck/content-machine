import { CaptionExportRequestSchema, runCaptionExport } from '../../src/harness/caption-export.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/caption-export',
  inputSchema: CaptionExportRequestSchema,
  handler: async ({ input }) => runCaptionExport(input),
});
