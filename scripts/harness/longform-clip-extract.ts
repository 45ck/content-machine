#!/usr/bin/env node
import { runHarnessTool } from '../../src/harness/json-stdio.ts';
import {
  LongformClipExtractRequestSchema,
  runLongformClipExtract,
} from '../../src/harness/longform-clip-extract.ts';

await runHarnessTool({
  tool: 'content-machine/longform-clip-extract',
  inputSchema: LongformClipExtractRequestSchema,
  handler: async ({ input }) => runLongformClipExtract(input),
});
