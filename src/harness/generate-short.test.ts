import { beforeEach, describe, expect, it, vi } from 'vitest';

const stageMocks = vi.hoisted(() => ({
  generateBriefToScript: vi.fn(),
  ingestReferenceVideo: vi.fn(),
  runScriptToAudio: vi.fn(),
  runTimestampsToVisuals: vi.fn(),
  runVideoRender: vi.fn(),
  runPublishPrep: vi.fn(),
}));

vi.mock('./brief-to-script', () => ({
  generateBriefToScript: stageMocks.generateBriefToScript,
}));

vi.mock('./ingest', async () => {
  const { z } = await import('zod');
  return {
    ingestReferenceVideo: stageMocks.ingestReferenceVideo,
    IngestRequestSchema: z
      .object({
        videoPath: z.string(),
        outputDir: z.string().default('output/content-machine/ingest'),
        includeFrameAnalysis: z.boolean().default(true),
        frameAnalysis: z.object({}).passthrough().default({}),
        videospec: z.object({}).passthrough().default({}),
        classify: z.object({}).passthrough().default({}),
        blueprint: z.object({}).passthrough().default({}),
      })
      .strict(),
  };
});

vi.mock('./script-to-audio', async () => {
  const { z } = await import('zod');
  return {
    runScriptToAudio: stageMocks.runScriptToAudio,
    ScriptToAudioRequestSchema: z
      .object({
        scriptPath: z.string(),
        voice: z.string().default('af_heart'),
        outputDir: z.string().optional(),
        outputPath: z.string().optional(),
        timestampsPath: z.string().optional(),
        outputMetadataPath: z.string().optional(),
        mock: z.boolean().default(false),
      })
      .strict(),
  };
});

vi.mock('./timestamps-to-visuals', async () => {
  const { z } = await import('zod');
  return {
    runTimestampsToVisuals: stageMocks.runTimestampsToVisuals,
    TimestampsToVisualsRequestSchema: z
      .object({
        timestampsPath: z.string(),
        outputPath: z.string().default('output/content-machine/visuals/visuals.json'),
        topic: z.string().optional(),
        mock: z.boolean().default(false),
      })
      .strict(),
  };
});

vi.mock('./video-render', async () => {
  const { z } = await import('zod');
  return {
    runVideoRender: stageMocks.runVideoRender,
    VideoRenderRequestSchema: z
      .object({
        visualsPath: z.string(),
        timestampsPath: z.string(),
        audioPath: z.string(),
        outputPath: z.string().default('output/content-machine/render/render.mp4'),
        outputMetadataPath: z.string().optional(),
        mock: z.boolean().default(false),
      })
      .strict(),
  };
});

vi.mock('./publish-prep', async () => {
  const { z } = await import('zod');
  return {
    runPublishPrep: stageMocks.runPublishPrep,
    PublishPrepRequestSchema: z
      .object({
        videoPath: z.string(),
        scriptPath: z.string(),
        outputDir: z.string().default('output/content-machine/publish-prep'),
        platform: z.enum(['tiktok', 'instagram', 'youtube']).default('tiktok'),
        packaging: z.object({}).passthrough().default({}),
        publish: z.object({}).passthrough().default({}),
        validate: z.object({}).passthrough().default({}),
      })
      .strict(),
  };
});

import { runGenerateShort } from './generate-short';

describe('runGenerateShort', () => {
  beforeEach(() => {
    Object.values(stageMocks).forEach((mock) => mock.mockReset());
  });

  it('orchestrates the stage wrappers without a reference video', async () => {
    stageMocks.generateBriefToScript.mockResolvedValue({
      result: {
        outputPath: '/tmp/run/script/script.json',
        title: 'Script',
        sceneCount: 3,
      },
      artifacts: [{ path: '/tmp/run/script/script.json', kind: 'file', description: 'script' }],
    });
    stageMocks.runScriptToAudio.mockResolvedValue({
      result: {
        audioPath: '/tmp/run/audio/audio.wav',
        timestampsPath: '/tmp/run/audio/timestamps.json',
        outputMetadataPath: '/tmp/run/audio/audio.json',
      },
      artifacts: [{ path: '/tmp/run/audio/audio.wav', kind: 'file', description: 'audio' }],
    });
    stageMocks.runTimestampsToVisuals.mockResolvedValue({
      result: {
        outputPath: '/tmp/run/visuals/visuals.json',
        sceneCount: 3,
      },
      artifacts: [{ path: '/tmp/run/visuals/visuals.json', kind: 'file', description: 'visuals' }],
    });
    stageMocks.runVideoRender.mockResolvedValue({
      result: {
        outputPath: '/tmp/run/render/video.mp4',
        outputMetadataPath: '/tmp/run/render/render.json',
      },
      artifacts: [{ path: '/tmp/run/render/video.mp4', kind: 'file', description: 'video' }],
    });

    const result = await runGenerateShort({
      topic: 'Redis vs PostgreSQL for caching',
      outputDir: '/tmp/run',
      archetype: 'versus',
      audio: { voice: 'af_heart', mock: true },
      visuals: { mock: true },
      render: { mock: true },
      publishPrep: { enabled: false },
    });

    expect(stageMocks.ingestReferenceVideo).not.toHaveBeenCalled();
    expect(stageMocks.generateBriefToScript).toHaveBeenCalledWith({
      topic: 'Redis vs PostgreSQL for caching',
      archetype: 'versus',
      targetDuration: 45,
      outputPath: '/tmp/run/script/script.json',
      blueprintPath: undefined,
      llmProvider: 'default',
    });
    expect(stageMocks.runScriptToAudio).toHaveBeenCalledWith({
      voice: 'af_heart',
      mock: true,
      scriptPath: '/tmp/run/script/script.json',
      outputDir: '/tmp/run/audio',
    });
    expect(stageMocks.runTimestampsToVisuals).toHaveBeenCalledWith({
      mock: true,
      timestampsPath: '/tmp/run/audio/timestamps.json',
      outputPath: '/tmp/run/visuals/visuals.json',
      topic: 'Redis vs PostgreSQL for caching',
    });
    expect(stageMocks.runVideoRender).toHaveBeenCalledWith({
      mock: true,
      visualsPath: '/tmp/run/visuals/visuals.json',
      timestampsPath: '/tmp/run/audio/timestamps.json',
      audioPath: '/tmp/run/audio/audio.wav',
      outputPath: '/tmp/run/render/video.mp4',
      outputMetadataPath: '/tmp/run/render/render.json',
    });
    expect(stageMocks.runPublishPrep).not.toHaveBeenCalled();
    expect(result.result.publishPrepDir).toBeNull();
    expect(result.result.publishReady).toBeNull();
    expect(result.result.archetype).toBe('versus');
    expect(result.artifacts).toEqual(
      expect.arrayContaining([
        {
          path: '/tmp/run',
          kind: 'directory',
          description: 'Generate-short output directory',
        },
        { path: '/tmp/run/script/script.json', kind: 'file', description: 'script' },
        { path: '/tmp/run/render/video.mp4', kind: 'file', description: 'video' },
      ])
    );
  });

  it('uses reference ingest outputs and runs publish prep by default', async () => {
    stageMocks.ingestReferenceVideo.mockResolvedValue({
      result: {
        outputDir: '/tmp/ref/ingest',
        blueprintPath: '/tmp/ref/ingest/blueprint.v1.json',
        archetype: 'story',
      },
      artifacts: [{ path: '/tmp/ref/ingest', kind: 'directory', description: 'ingest' }],
    });
    stageMocks.generateBriefToScript.mockResolvedValue({
      result: {
        outputPath: '/tmp/ref/script/script.json',
        title: 'Script',
        sceneCount: 4,
      },
      artifacts: [{ path: '/tmp/ref/script/script.json', kind: 'file', description: 'script' }],
    });
    stageMocks.runScriptToAudio.mockResolvedValue({
      result: {
        audioPath: '/tmp/ref/audio/audio.wav',
        timestampsPath: '/tmp/ref/audio/timestamps.json',
        outputMetadataPath: '/tmp/ref/audio/audio.json',
      },
      artifacts: [{ path: '/tmp/ref/audio/audio.wav', kind: 'file', description: 'audio' }],
    });
    stageMocks.runTimestampsToVisuals.mockResolvedValue({
      result: {
        outputPath: '/tmp/ref/visuals/visuals.json',
        sceneCount: 4,
      },
      artifacts: [{ path: '/tmp/ref/visuals/visuals.json', kind: 'file', description: 'visuals' }],
    });
    stageMocks.runVideoRender.mockResolvedValue({
      result: {
        outputPath: '/tmp/ref/render/video.mp4',
        outputMetadataPath: '/tmp/ref/render/render.json',
      },
      artifacts: [{ path: '/tmp/ref/render/video.mp4', kind: 'file', description: 'video' }],
    });
    stageMocks.runPublishPrep.mockResolvedValue({
      result: {
        outputDir: '/tmp/ref/publish-prep',
        passed: true,
      },
      artifacts: [{ path: '/tmp/ref/publish-prep', kind: 'directory', description: 'publish' }],
    });

    const result = await runGenerateShort({
      topic: 'How Stripe was built',
      outputDir: '/tmp/ref',
      referenceVideoPath: '/tmp/winner.mp4',
      audio: { voice: 'af_heart', mock: true },
      visuals: { mock: true },
      render: { mock: true },
    });

    expect(stageMocks.ingestReferenceVideo).toHaveBeenCalledWith({
      videoPath: '/tmp/winner.mp4',
      outputDir: '/tmp/ref/ingest',
      includeFrameAnalysis: true,
      frameAnalysis: {},
      videospec: {},
      classify: {},
      blueprint: {},
    });
    expect(stageMocks.generateBriefToScript).toHaveBeenCalledWith({
      topic: 'How Stripe was built',
      archetype: 'story',
      targetDuration: 45,
      outputPath: '/tmp/ref/script/script.json',
      blueprintPath: '/tmp/ref/ingest/blueprint.v1.json',
      llmProvider: 'default',
    });
    expect(stageMocks.runPublishPrep).toHaveBeenCalledWith({
      platform: 'tiktok',
      packaging: {},
      publish: {},
      validate: {},
      videoPath: '/tmp/ref/render/video.mp4',
      scriptPath: '/tmp/ref/script/script.json',
      outputDir: '/tmp/ref/publish-prep',
    });
    expect(result.result.referenceOutputDir).toBe('/tmp/ref/ingest');
    expect(result.result.publishPrepDir).toBe('/tmp/ref/publish-prep');
    expect(result.result.publishReady).toBe(true);
    expect(result.result.referenceArchetype).toBe('story');
  });
});
