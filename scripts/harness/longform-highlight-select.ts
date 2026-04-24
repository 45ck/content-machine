#!/usr/bin/env node
import {
  LongformHighlightSelectRequestSchema,
  runLongformHighlightSelect,
} from '../../src/harness/longform-highlight-select.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/longform-highlight-select',
  inputSchema: LongformHighlightSelectRequestSchema,
  handler: async ({ input }) => runLongformHighlightSelect(input),
});
