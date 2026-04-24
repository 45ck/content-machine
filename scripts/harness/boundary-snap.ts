#!/usr/bin/env node
import { BoundarySnapRequestSchema, runBoundarySnap } from '../../src/harness/boundary-snap.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/boundary-snap',
  inputSchema: BoundarySnapRequestSchema,
  handler: async ({ input }) => runBoundarySnap(input),
});
