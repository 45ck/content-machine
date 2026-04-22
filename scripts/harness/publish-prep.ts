#!/usr/bin/env node
import { PublishPrepRequestSchema, runPublishPrep } from '../../src/harness/publish-prep.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/publish-prep',
  inputSchema: PublishPrepRequestSchema,
  handler: async ({ input }) => runPublishPrep(input),
});
