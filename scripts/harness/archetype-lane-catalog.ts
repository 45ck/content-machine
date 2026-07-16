#!/usr/bin/env node
import { runHarnessTool } from '../../src/harness/json-stdio.ts';
import {
  ArchetypeLaneCatalogRequestSchema,
  listArchetypeLanes,
} from '../../src/harness/archetype-lane-catalog.ts';

await runHarnessTool({
  tool: 'content-machine/archetype-lane-catalog',
  inputSchema: ArchetypeLaneCatalogRequestSchema,
  handler: async ({ input }) => listArchetypeLanes(input),
});
