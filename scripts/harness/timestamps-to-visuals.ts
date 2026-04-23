#!/usr/bin/env node
import { runHarnessTool } from '../../src/harness/json-stdio.ts';
import {
  runTimestampsToVisuals,
  TimestampsToVisualsRequestSchema,
} from '../../src/harness/timestamps-to-visuals.ts';

await runHarnessTool({
  tool: 'content-machine/timestamps-to-visuals',
  inputSchema: TimestampsToVisualsRequestSchema,
  handler: async ({ input }) => runTimestampsToVisuals(input),
});
