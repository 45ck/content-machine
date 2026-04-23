#!/usr/bin/env node
import { runHarnessTool } from '../../src/harness/json-stdio.ts';
import { RunFlowRequestSchema, runFlowHandler } from '../../src/harness/flow-runner.ts';

await runHarnessTool({
  tool: 'content-machine/run-flow',
  inputSchema: RunFlowRequestSchema,
  handler: runFlowHandler,
});
