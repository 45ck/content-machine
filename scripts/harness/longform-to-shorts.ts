#!/usr/bin/env node
import { runHarnessTool } from '../../src/harness/json-stdio.ts';
import {
  LongformToShortsRequestSchema,
  runLongformToShorts,
} from '../../src/harness/longform-to-shorts.ts';

await runHarnessTool({
  tool: 'content-machine/longform-to-shorts',
  inputSchema: LongformToShortsRequestSchema,
  handler: async ({ input }) => runLongformToShorts(input),
});
