import { mkdtemp, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { createContentMachineMcpTools } from './tools';
import { McpSessionStore } from './session-store';
import { loadFastMcp } from './fastmcp';

function createTestContext(sessionId: string) {
  return {
    sessionId,
    log: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    reportProgress: async () => {},
  } as const;
}

describe('MCP tools', () => {
  it('chains audio → visuals → render using session state (mock mode)', async () => {
    const artifactsRoot = await mkdtemp(join(tmpdir(), 'cm-mcp-'));
    try {
      const sessionStore = new McpSessionStore({ artifactsRootDir: artifactsRoot });
      const tools = createContentMachineMcpTools({ sessionStore });
      const ctx = createTestContext('test-session');

      const script = {
        schemaVersion: '1.0.0',
        reasoning: 'test',
        scenes: [
          {
            id: 'scene-001',
            text: 'Hello world',
            visualDirection: 'abstract background',
          },
        ],
      };

      const audioArgs = tools.generate_audio.parameters.parse({
        script,
        voice: 'af_heart',
        mock: true,
        saveToSession: true,
      });
      const audio = await tools.generate_audio.execute(audioArgs, ctx);
      expect(audio.audioPath).toMatch(/audio\.wav$/);
      await expect(stat(audio.audioPath)).resolves.toBeTruthy();
      await expect(stat(audio.timestampsPath)).resolves.toBeTruthy();

      const visualsArgs = tools.match_visuals.parameters.parse({
        mock: true,
        saveToSession: true,
      });
      const visuals = await tools.match_visuals.execute(visualsArgs, ctx);
      expect(visuals.scenes.length).toBeGreaterThan(0);

      const renderArgs = tools.render_video.parameters.parse({
        mock: true,
        saveToSession: true,
      });
      const render = await tools.render_video.execute(renderArgs, ctx);
      expect(render.outputPath).toMatch(/video\.mp4$/);
      await expect(stat(render.outputPath)).resolves.toBeTruthy();

      const session = await sessionStore.get(ctx);
      expect(session.lastAudio).toBeTruthy();
      expect(session.lastTimestamps).toBeTruthy();
      expect(session.lastVisuals).toBeTruthy();
      expect(session.lastRender).toBeTruthy();
    } finally {
      await rm(artifactsRoot, { recursive: true, force: true });
    }
  });

  it('throws a UserError when a stage is missing required prior outputs', async () => {
    const artifactsRoot = await mkdtemp(join(tmpdir(), 'cm-mcp-'));
    try {
      const sessionStore = new McpSessionStore({ artifactsRootDir: artifactsRoot });
      const tools = createContentMachineMcpTools({ sessionStore });
      const ctx = createTestContext('missing-prereq');

      const visualsArgs = tools.match_visuals.parameters.parse({ mock: true });
      const { UserError } = await loadFastMcp();
      await expect(tools.match_visuals.execute(visualsArgs, ctx)).rejects.toBeInstanceOf(UserError);
    } finally {
      await rm(artifactsRoot, { recursive: true, force: true });
    }
  });
});
