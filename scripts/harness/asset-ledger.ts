#!/usr/bin/env node
import { AssetLedgerRequestSchema, runAssetLedger } from '../../src/harness/asset-ledger.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/asset-ledger',
  inputSchema: AssetLedgerRequestSchema,
  handler: async ({ input }) => runAssetLedger(input),
});
