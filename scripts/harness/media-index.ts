#!/usr/bin/env node
import { MediaIndexRequestSchema, runMediaIndex } from '../../src/harness/media-index.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/media-index',
  inputSchema: MediaIndexRequestSchema,
  handler: async ({ input }) => runMediaIndex(input),
});
