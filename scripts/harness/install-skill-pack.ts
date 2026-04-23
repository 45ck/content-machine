#!/usr/bin/env node
import {
  InstallSkillPackRequestSchema,
  installSkillPack,
} from '../../src/harness/install-skill-pack.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/install-skill-pack',
  inputSchema: InstallSkillPackRequestSchema,
  handler: async ({ input }) => installSkillPack(input),
});
