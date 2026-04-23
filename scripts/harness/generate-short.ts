#!/usr/bin/env node
import { GenerateShortRequestSchema, runGenerateShort } from '../../src/harness/generate-short.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/generate-short',
  inputSchema: GenerateShortRequestSchema,
  handler: async ({ input }) => runGenerateShort(input),
});
