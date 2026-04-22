#!/usr/bin/env node
import { IngestRequestSchema, ingestReferenceVideo } from '../../src/harness/ingest.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/ingest',
  inputSchema: IngestRequestSchema,
  handler: async ({ input }) => ingestReferenceVideo(input),
});
