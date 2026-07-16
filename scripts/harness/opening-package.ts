#!/usr/bin/env node
import {
  buildOpeningPackage,
  OpeningPackageRequestSchema,
} from '../../src/harness/opening-package.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/opening-package',
  inputSchema: OpeningPackageRequestSchema,
  handler: async ({ input }) => buildOpeningPackage(input),
});
