#!/usr/bin/env node
import { IngestRequestSchema, ingestReferenceVideo } from '../../src/harness/ingest.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/reverse-engineer-winner',
  inputSchema: IngestRequestSchema,
  handler: async ({ input }) => ingestReferenceVideo(input),
});
