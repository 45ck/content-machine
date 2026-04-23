#!/usr/bin/env node
import { runHarnessTool } from '../../src/harness/json-stdio.ts';
import { listSkillCatalog, SkillCatalogRequestSchema } from '../../src/harness/skill-catalog.ts';

await runHarnessTool({
  tool: 'content-machine/skill-catalog',
  inputSchema: SkillCatalogRequestSchema,
  handler: async ({ input }) => listSkillCatalog(input),
});
