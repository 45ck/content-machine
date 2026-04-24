#!/usr/bin/env node
import {
  StyleProfileLibraryRequestSchema,
  runStyleProfileLibrary,
} from '../../src/harness/style-profile-library.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/style-profile-library',
  inputSchema: StyleProfileLibraryRequestSchema,
  handler: async ({ input }) => runStyleProfileLibrary(input),
});
