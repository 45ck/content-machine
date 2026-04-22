#!/usr/bin/env node
import {
  generateBriefToScript,
  BriefToScriptRequestSchema,
} from '../../src/harness/brief-to-script.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/brief-to-script',
  inputSchema: BriefToScriptRequestSchema,
  handler: async ({ input }) => generateBriefToScript(input),
});
