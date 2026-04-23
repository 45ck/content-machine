#!/usr/bin/env node
import { runHarnessTool } from '../../src/harness/json-stdio.ts';
import { runVideoRender, VideoRenderRequestSchema } from '../../src/harness/video-render.ts';

await runHarnessTool({
  tool: 'content-machine/video-render',
  inputSchema: VideoRenderRequestSchema,
  handler: async ({ input }) => runVideoRender(input),
});
