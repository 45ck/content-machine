#!/usr/bin/env node
import {
  HighlightApprovalRequestSchema,
  runHighlightApproval,
} from '../../src/harness/highlight-approval.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/highlight-approval',
  inputSchema: HighlightApprovalRequestSchema,
  handler: async ({ input }) => runHighlightApproval(input),
});
