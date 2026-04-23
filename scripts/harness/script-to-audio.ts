#!/usr/bin/env node
import { runHarnessTool } from '../../src/harness/json-stdio.ts';
import { runScriptToAudio, ScriptToAudioRequestSchema } from '../../src/harness/script-to-audio.ts';

await runHarnessTool({
  tool: 'content-machine/script-to-audio',
  inputSchema: ScriptToAudioRequestSchema,
  handler: async ({ input }) => runScriptToAudio(input),
});
