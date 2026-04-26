#!/usr/bin/env node
import {
  RedditStoryAssetsRequestSchema,
  runRedditStoryAssets,
} from '../../src/harness/reddit-story-assets.ts';
import { runHarnessTool } from '../../src/harness/json-stdio.ts';

await runHarnessTool({
  tool: 'content-machine/reddit-story-assets',
  inputSchema: RedditStoryAssetsRequestSchema,
  handler: async ({ input }) => runRedditStoryAssets(input),
});
