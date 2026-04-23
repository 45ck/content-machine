#!/usr/bin/env node
import { FlowCatalogRequestSchema, listFlowCatalog } from '../../src/harness/flow-catalog.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/flow-catalog',
  inputSchema: FlowCatalogRequestSchema,
  handler: async ({ input }) => listFlowCatalog(input),
});
