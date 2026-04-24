#!/usr/bin/env node
import {
  SourceMediaAnalyzeRequestSchema,
  runSourceMediaAnalyze,
} from '../../src/harness/source-media-analyze.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/source-media-analyze',
  inputSchema: SourceMediaAnalyzeRequestSchema,
  handler: async ({ input }) => runSourceMediaAnalyze(input),
});
