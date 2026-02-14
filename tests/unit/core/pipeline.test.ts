import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PipelineError } from '../../../src/core/errors';

const loadConfigMock = vi.fn();
const generateScriptMock = vi.fn();
const generateAudioMock = vi.fn();
const matchVisualsMock = vi.fn();
const renderVideoMock = vi.fn();
const synthesizeMediaManifestMock = vi.fn();
const applyMediaManifestToVisualsMock = vi.fn();

vi.mock('../../../src/core/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/core/config')>();
  return {
    ...actual,
    loadConfig: loadConfigMock,
  };
});

vi.mock('../../../src/script/generator', () => ({
  generateScript: generateScriptMock,
}));

vi.mock('../../../src/audio/pipeline', () => ({
  generateAudio: generateAudioMock,
}));

vi.mock('../../../src/visuals/matcher', () => ({
  matchVisuals: matchVisualsMock,
}));

vi.mock('../../../src/render/service', () => ({
  renderVideo: renderVideoMock,
}));

vi.mock('../../../src/media/service', () => ({
  synthesizeMediaManifest: synthesizeMediaManifestMock,
  applyMediaManifestToVisuals: applyMediaManifestToVisualsMock,
}));

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cm-pipeline-test-'));
}

describe('core pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadConfigMock.mockReturnValue({
      audio: {
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
        asrModel: 'base',
      },
      captions: {
        fontFamily: 'Test Sans',
        fontWeight: 'bold',
        fontFile: undefined,
        fonts: [],
      },
      sync: {
        strategy: 'standard',
        requireWhisper: false,
        asrModel: 'base',
        reconcileToScript: false,
      },
      visuals: {
        provider: 'pexels',
      },
      render: {
        fps: 30,
      },
    });
    applyMediaManifestToVisualsMock.mockImplementation((visuals) => visuals);
    synthesizeMediaManifestMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalScenes: 0,
      keyframesExtracted: 0,
      videosSynthesized: 0,
      scenes: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs with external artifacts and keeps artifacts when requested', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');

    const audioPath = path.join(dir, 'in-audio.wav');
    const audioMixPath = path.join(dir, 'in-audio.mix.json');
    fs.writeFileSync(audioPath, 'audio');
    fs.writeFileSync(audioMixPath, JSON.stringify({ schemaVersion: '1.0.0', layers: [] }));

    const scriptInput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
      meta: {
        archetype: 'listicle',
        topic: 'Redis',
        generatedAt: new Date().toISOString(),
        llmCost: 0.01,
      },
    };

    const timestamps = {
      schemaVersion: '1.0.0',
      allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
      totalDuration: 1,
      ttsEngine: 'kokoro',
      asrEngine: 'whisper',
    };

    const audioInput = {
      schemaVersion: '1.0.0',
      audioPath,
      timestampsPath: path.join(dir, 'timestamps.json'),
      timestamps,
      duration: 1,
      wordCount: 1,
      voice: 'external',
      sampleRate: 48000,
      ttsCost: 0.02,
      audioMixPath,
      audioMix: {
        schemaVersion: '1.0.0',
        voicePath: audioPath,
        totalDuration: 1,
        mixPreset: 'clean',
        lufsTarget: -16,
        layers: [],
        warnings: [],
      },
    };

    const visualsInput = {
      schemaVersion: '1.1.0',
      scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'clip.mp4', duration: 1 }],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 0,
    };

    renderVideoMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      outputPath,
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 123,
      codec: 'h264',
      archetype: 'listicle',
    });

    const { runPipeline } = await import('../../../src/core/pipeline');
    const result = await runPipeline({
      topic: 'Redis',
      archetype: 'listicle',
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 10,
      outputPath,
      keepArtifacts: true,
      scriptInput: scriptInput as never,
      audioInput: audioInput as never,
      visualsInput: visualsInput as never,
    });

    expect(result.outputPath).toBe(outputPath);
    expect(fs.existsSync(path.join(dir, 'script.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'audio.wav'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'timestamps.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'audio.mix.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'visuals.json'))).toBe(true);
  });

  it('cleans up generated artifacts when keepArtifacts is false', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');

    const scriptInput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
    };

    const visualsInput = {
      schemaVersion: '1.1.0',
      scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'clip.mp4', duration: 1 }],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 0,
    };

    generateAudioMock.mockImplementation(
      async ({ outputPath: audioOut, timestampsPath, audioMix }) => {
        fs.writeFileSync(audioOut, 'audio');
        fs.writeFileSync(
          timestampsPath,
          JSON.stringify({
            schemaVersion: '1.0.0',
            allWords: [{ word: 'hi', start: 0, end: 0.2 }],
            totalDuration: 1,
            ttsEngine: 'kokoro',
            asrEngine: 'whisper',
          })
        );
        const mixPath = audioMix?.outputPath ?? path.join(dir, 'audio.mix.json');
        fs.writeFileSync(mixPath, JSON.stringify({ schemaVersion: '1.0.0', layers: [] }));
        return {
          schemaVersion: '1.0.0',
          audioPath: audioOut,
          timestampsPath,
          timestamps: {
            schemaVersion: '1.0.0',
            allWords: [{ word: 'hi', start: 0, end: 0.2 }],
            totalDuration: 1,
            ttsEngine: 'kokoro',
            asrEngine: 'whisper',
          },
          duration: 1,
          wordCount: 1,
          voice: 'af_heart',
          sampleRate: 48000,
          audioMixPath: mixPath,
          audioMix: {
            schemaVersion: '1.0.0',
            voicePath: audioOut,
            totalDuration: 1,
            mixPreset: 'clean',
            lufsTarget: -16,
            layers: [],
            warnings: [],
          },
        };
      }
    );

    renderVideoMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      outputPath,
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 123,
      codec: 'h264',
      archetype: 'listicle',
    });

    const { runPipeline } = await import('../../../src/core/pipeline');
    await runPipeline({
      topic: 'Redis',
      archetype: 'listicle',
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 10,
      outputPath,
      keepArtifacts: false,
      scriptInput: scriptInput as never,
      visualsInput: visualsInput as never,
      audioMix: { outputPath: path.join(dir, 'audio.mix.json'), options: {} },
    });

    expect(fs.existsSync(path.join(dir, 'audio.wav'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'timestamps.json'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'audio.mix.json'))).toBe(false);
  });

  it('runs all stages when no external artifacts are provided', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');

    generateScriptMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
      meta: { archetype: 'listicle', topic: 'Redis', generatedAt: new Date().toISOString() },
    });

    generateAudioMock.mockImplementation(async ({ outputPath: audioOut, timestampsPath }) => {
      fs.writeFileSync(audioOut, 'audio');
      fs.writeFileSync(
        timestampsPath,
        JSON.stringify({
          schemaVersion: '1.0.0',
          allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
          totalDuration: 1,
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        })
      );

      return {
        schemaVersion: '1.0.0',
        audioPath: audioOut,
        timestampsPath,
        timestamps: {
          schemaVersion: '1.0.0',
          allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
          totalDuration: 1,
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        },
        duration: 1,
        wordCount: 1,
        voice: 'af_heart',
        sampleRate: 48000,
      };
    });

    matchVisualsMock.mockResolvedValue({
      schemaVersion: '1.1.0',
      scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'clip.mp4', duration: 1 }],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 0,
    });

    renderVideoMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      outputPath,
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 123,
      codec: 'h264',
      archetype: 'listicle',
    });

    const { runPipeline } = await import('../../../src/core/pipeline');
    await runPipeline({
      topic: 'Redis',
      archetype: 'listicle',
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 10,
      outputPath,
      keepArtifacts: true,
      mock: true,
    });

    expect(generateScriptMock).toHaveBeenCalled();
    expect(generateAudioMock).toHaveBeenCalled();
    expect(matchVisualsMock).toHaveBeenCalled();
    expect(renderVideoMock).toHaveBeenCalled();

    expect(fs.existsSync(path.join(dir, 'script.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'audio.wav'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'timestamps.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'visuals.json'))).toBe(true);
  });

  it('cleans up generated artifacts on render failure when keepArtifacts is false', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');
    fs.writeFileSync(outputPath, 'stale');

    const scriptInput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
    };

    const visualsInput = {
      schemaVersion: '1.1.0',
      scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'clip.mp4', duration: 1 }],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 0,
    };

    generateAudioMock.mockImplementation(async ({ outputPath: audioOut, timestampsPath }) => {
      fs.writeFileSync(audioOut, 'audio');
      fs.writeFileSync(
        timestampsPath,
        JSON.stringify({
          schemaVersion: '1.0.0',
          allWords: [{ word: 'hi', start: 0, end: 0.2 }],
          totalDuration: 1,
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        })
      );
      return {
        schemaVersion: '1.0.0',
        audioPath: audioOut,
        timestampsPath,
        timestamps: {
          schemaVersion: '1.0.0',
          allWords: [{ word: 'hi', start: 0, end: 0.2 }],
          totalDuration: 1,
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        },
        duration: 1,
        wordCount: 1,
        voice: 'af_heart',
        sampleRate: 48000,
      };
    });

    renderVideoMock.mockRejectedValue(new Error('boom'));

    const { runPipeline } = await import('../../../src/core/pipeline');
    await expect(
      runPipeline({
        topic: 'Redis',
        archetype: 'listicle',
        orientation: 'portrait',
        voice: 'af_heart',
        targetDuration: 10,
        outputPath,
        keepArtifacts: false,
        mock: true,
        scriptInput: scriptInput as never,
        visualsInput: visualsInput as never,
      })
    ).rejects.toMatchObject({ stage: 'render' });

    expect(fs.existsSync(path.join(dir, 'audio.wav'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'timestamps.json'))).toBe(false);
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it('emits stage progress events and clamps progress values', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');
    const eventEmitter = { emit: vi.fn() };

    generateScriptMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
      meta: { archetype: 'listicle', topic: 'Redis', generatedAt: new Date().toISOString() },
    });

    generateAudioMock.mockImplementation(async ({ outputPath: audioOut, timestampsPath }) => {
      fs.writeFileSync(audioOut, 'audio');
      fs.writeFileSync(
        timestampsPath,
        JSON.stringify({
          schemaVersion: '1.0.0',
          allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
          totalDuration: 1,
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        })
      );

      return {
        schemaVersion: '1.0.0',
        audioPath: audioOut,
        timestampsPath,
        timestamps: {
          schemaVersion: '1.0.0',
          allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
          totalDuration: 1,
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        },
        duration: 1,
        wordCount: 1,
        voice: 'af_heart',
        sampleRate: 48000,
      };
    });

    matchVisualsMock.mockImplementation(async ({ onProgress }) => {
      onProgress?.({ phase: 'match', progress: 2, message: 'too high' });
      onProgress?.({ phase: 'match', progress: Number.NaN, message: 'not finite' });
      return {
        schemaVersion: '1.1.0',
        scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'clip.mp4', duration: 1 }],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 0,
        fallbacks: 0,
        fromGenerated: 0,
      };
    });

    renderVideoMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      outputPath,
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 123,
      codec: 'h264',
      archetype: 'listicle',
    });

    const { runPipeline } = await import('../../../src/core/pipeline');
    await runPipeline({
      topic: 'Redis',
      archetype: 'listicle',
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 10,
      outputPath,
      keepArtifacts: false,
      mock: true,
      eventEmitter: eventEmitter as never,
    });

    const progressEvents = (eventEmitter.emit as ReturnType<typeof vi.fn>).mock.calls
      .map((call) => call[0])
      .filter((event: any) => event?.type === 'stage:progress');

    expect(
      progressEvents.some((event: any) => event.stage === 'visuals' && event.progress === 1)
    ).toBe(true);
    expect(
      progressEvents.some((event: any) => event.stage === 'visuals' && event.progress === 0)
    ).toBe(true);
  });

  it('defaults caption font family from config.captions.fonts when present', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');

    loadConfigMock.mockReturnValue({
      audio: {
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
        asrModel: 'base',
      },
      captions: {
        fontFamily: 'Fallback Sans',
        fontWeight: 'bold',
        fontFile: undefined,
        fonts: [{ family: 'Config Font', src: 'fonts/config.ttf' }],
      },
      sync: {
        strategy: 'standard',
        requireWhisper: false,
        asrModel: 'base',
        reconcileToScript: false,
      },
      visuals: {
        provider: 'pexels',
      },
      render: {
        fps: 30,
      },
    });

    generateScriptMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
      meta: { archetype: 'listicle', topic: 'Redis', generatedAt: new Date().toISOString() },
    });

    generateAudioMock.mockImplementation(async ({ outputPath: audioOut, timestampsPath }) => {
      fs.writeFileSync(audioOut, 'audio');
      fs.writeFileSync(
        timestampsPath,
        JSON.stringify({
          schemaVersion: '1.0.0',
          allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
          totalDuration: 1,
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        })
      );
      return {
        schemaVersion: '1.0.0',
        audioPath: audioOut,
        timestampsPath,
        timestamps: {
          schemaVersion: '1.0.0',
          allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
          totalDuration: 1,
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        },
        duration: 1,
        wordCount: 1,
        voice: 'af_heart',
        sampleRate: 48000,
      };
    });

    matchVisualsMock.mockResolvedValue({
      schemaVersion: '1.1.0',
      scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'clip.mp4', duration: 1 }],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 0,
    });

    renderVideoMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      outputPath,
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 123,
      codec: 'h264',
      archetype: 'listicle',
    });

    const { runPipeline } = await import('../../../src/core/pipeline');
    await runPipeline({
      topic: 'Redis',
      archetype: 'listicle',
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 10,
      outputPath,
      keepArtifacts: false,
      mock: true,
    });

    expect(renderVideoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        captionFontFamily: 'Config Font',
        fonts: [{ family: 'Config Font', src: 'fonts/config.ttf' }],
      })
    );
  });

  it('does not delete outputPath when an early stage fails before rendering', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');
    fs.writeFileSync(outputPath, 'should-not-delete');

    generateScriptMock.mockRejectedValue(new PipelineError('script', 'boom'));

    const { runPipeline } = await import('../../../src/core/pipeline');
    await expect(
      runPipeline({
        topic: 'Redis',
        archetype: 'listicle',
        orientation: 'portrait',
        voice: 'af_heart',
        targetDuration: 10,
        outputPath,
        keepArtifacts: false,
        mock: true,
      })
    ).rejects.toMatchObject({ stage: 'script' });

    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it('calls onProgress hooks, defaults audioMix outputPath, and handles missing render progress', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');
    const onProgress = vi.fn();

    generateScriptMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
      meta: { archetype: 'listicle', topic: 'Redis', generatedAt: new Date().toISOString() },
    });

    generateAudioMock.mockImplementation(
      async ({ outputPath: audioOut, timestampsPath, audioMix, requireWhisper, whisperModel }) => {
        expect(requireWhisper).toBe(true);
        expect(whisperModel).toBe('tiny');
        expect(audioMix?.outputPath).toBe(path.join(dir, 'audio.mix.json'));

        fs.writeFileSync(audioOut, 'audio');
        fs.writeFileSync(
          timestampsPath,
          JSON.stringify({
            schemaVersion: '1.0.0',
            allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
            totalDuration: 1,
            ttsEngine: 'kokoro',
            asrEngine: 'whisper',
          })
        );

        const mixPath = audioMix?.outputPath;
        if (mixPath) {
          fs.writeFileSync(mixPath, JSON.stringify({ schemaVersion: '1.0.0', layers: [] }));
        }

        return {
          schemaVersion: '1.0.0',
          audioPath: audioOut,
          timestampsPath,
          timestamps: {
            schemaVersion: '1.0.0',
            allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
            totalDuration: 1,
            ttsEngine: 'kokoro',
            asrEngine: 'whisper',
          },
          duration: 1,
          wordCount: 1,
          voice: 'af_heart',
          sampleRate: 48000,
          audioMixPath: mixPath,
          audioMix: mixPath
            ? {
                schemaVersion: '1.0.0',
                voicePath: audioOut,
                totalDuration: 1,
                mixPreset: 'clean',
                lufsTarget: -16,
                layers: [],
                warnings: [],
              }
            : undefined,
        };
      }
    );

    matchVisualsMock.mockImplementation(async ({ onProgress: onProgressVisuals }) => {
      onProgressVisuals?.({ phase: 'match', progress: 0.5, message: 'half' });
      return {
        schemaVersion: '1.1.0',
        scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'clip.mp4', duration: 1 }],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 0,
        fallbacks: 0,
        fromGenerated: 0,
      };
    });

    renderVideoMock.mockImplementation(async ({ onProgress: onProgressRender }) => {
      onProgressRender?.({ phase: 'render-media', progress: 0.5, message: 'half' });
      onProgressRender?.({ phase: 'render-media', message: 'no percent' });
      return {
        schemaVersion: '1.0.0',
        outputPath,
        duration: 1,
        width: 1080,
        height: 1920,
        fps: 30,
        fileSize: 123,
        codec: 'h264',
        archetype: 'listicle',
      };
    });

    const { runPipeline } = await import('../../../src/core/pipeline');
    await runPipeline({
      topic: 'Redis',
      archetype: 'listicle',
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 10,
      outputPath,
      keepArtifacts: false,
      mock: true,
      pipelineMode: 'audio-first',
      whisperModel: 'tiny',
      audioMix: { outputPath: undefined, options: {} } as any,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
  });

  it('handles external artifacts with eventEmitter/onProgress and keeps artifacts without copying identical paths', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');
    const eventEmitter = { emit: vi.fn() };
    const onProgress = vi.fn();

    const scriptInput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
      meta: {
        archetype: 'listicle',
        topic: 'Redis',
        generatedAt: new Date().toISOString(),
        llmCost: 0.01,
      },
    };

    const audioPath = path.join(dir, 'audio.wav'); // equals artifacts.audio
    fs.writeFileSync(audioPath, 'audio');

    const timestamps = {
      schemaVersion: '1.0.0',
      allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
      totalDuration: 1,
      ttsEngine: 'kokoro',
      asrEngine: 'whisper',
    };

    const audioInput = {
      schemaVersion: '1.0.0',
      audioPath,
      timestampsPath: path.join(dir, 'timestamps.json'),
      timestamps,
      duration: 1,
      wordCount: 1,
      voice: 'external',
      sampleRate: 48000,
      ttsCost: 0.02,
    };

    const visualsInput = {
      schemaVersion: '1.1.0',
      scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'clip.mp4', duration: 1 }],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 0,
    };

    renderVideoMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      outputPath,
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 123,
      codec: 'h264',
      archetype: 'listicle',
    });

    const { runPipeline } = await import('../../../src/core/pipeline');
    const result = await runPipeline({
      topic: 'Redis',
      archetype: 'listicle',
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 10,
      outputPath,
      keepArtifacts: true,
      scriptInput: scriptInput as never,
      audioInput: audioInput as never,
      visualsInput: visualsInput as never,
      eventEmitter: eventEmitter as never,
      onProgress,
    });

    expect(result.outputPath).toBe(outputPath);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pipeline:started' })
    );
    expect(onProgress).toHaveBeenCalled();
  });

  it('wraps non-Error script failures and emits stage+pipeline failure events', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');
    const eventEmitter = { emit: vi.fn() };

    generateScriptMock.mockRejectedValue('boom');

    const { runPipeline } = await import('../../../src/core/pipeline');
    await expect(
      runPipeline({
        topic: 'Redis',
        archetype: 'listicle',
        orientation: 'portrait',
        voice: 'af_heart',
        targetDuration: 10,
        outputPath,
        keepArtifacts: false,
        mock: true,
        whisperModel: 'nope' as any,
        eventEmitter: eventEmitter as never,
      })
    ).rejects.toMatchObject({ stage: 'script' });

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stage:failed', stage: 'script' })
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pipeline:failed' })
    );
  });

  it('wraps unexpected errors as generate PipelineError and emits pipeline:failed', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');

    loadConfigMock.mockReturnValue({
      audio: {
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
        asrModel: 'base',
      },
      captions: {
        fontFamily: 'Test Sans',
        fontWeight: 'bold',
        fontFile: undefined,
        fonts: [],
      },
      sync: {
        strategy: undefined,
        requireWhisper: false,
        asrModel: 'base',
        reconcileToScript: false,
      },
      visuals: {
        provider: 'pexels',
      },
      render: {
        fps: 30,
      },
    });

    const eventEmitter = {
      emit: vi.fn((event: any) => {
        if (event?.type === 'stage:started' && event?.stage === 'script') {
          throw 'emit boom';
        }
      }),
    };

    generateScriptMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
    });

    const { runPipeline } = await import('../../../src/core/pipeline');
    await expect(
      runPipeline({
        topic: 'Redis',
        archetype: 'listicle',
        orientation: 'portrait',
        voice: 'af_heart',
        targetDuration: 10,
        outputPath,
        keepArtifacts: false,
        mock: true,
        eventEmitter: eventEmitter as never,
      })
    ).rejects.toMatchObject({ stage: 'generate' });

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pipeline:failed' })
    );
  });

  it('emits stage:failed when audio generation fails', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');
    const eventEmitter = { emit: vi.fn() };

    generateScriptMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
    });

    generateAudioMock.mockRejectedValue(new Error('boom'));

    const { runPipeline } = await import('../../../src/core/pipeline');
    await expect(
      runPipeline({
        topic: 'Redis',
        archetype: 'listicle',
        orientation: 'portrait',
        voice: 'af_heart',
        targetDuration: 10,
        outputPath,
        keepArtifacts: false,
        mock: true,
        eventEmitter: eventEmitter as never,
      })
    ).rejects.toMatchObject({ stage: 'audio' });

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stage:failed', stage: 'audio' })
    );
  });

  it('emits stage:failed from runStageWithEvents when visuals stage fails', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');
    const eventEmitter = { emit: vi.fn() };

    generateScriptMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
    });

    generateAudioMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      audioPath: path.join(dir, 'audio.wav'),
      timestampsPath: path.join(dir, 'timestamps.json'),
      timestamps: {
        schemaVersion: '1.0.0',
        allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
        totalDuration: 1,
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
      },
      duration: 1,
      wordCount: 1,
      voice: 'af_heart',
      sampleRate: 48000,
    });

    matchVisualsMock.mockRejectedValue(new Error('boom'));

    const { runPipeline } = await import('../../../src/core/pipeline');
    await expect(
      runPipeline({
        topic: 'Redis',
        archetype: 'listicle',
        orientation: 'portrait',
        voice: 'af_heart',
        targetDuration: 10,
        outputPath,
        keepArtifacts: false,
        mock: true,
        eventEmitter: eventEmitter as never,
      })
    ).rejects.toMatchObject({ stage: 'visuals' });

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stage:failed', stage: 'visuals' })
    );
  });

  it('auto-enables media synthesis for advanced image motion and renders rewritten visuals', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');

    generateScriptMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
    });
    generateAudioMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      audioPath: path.join(dir, 'audio.wav'),
      timestampsPath: path.join(dir, 'timestamps.json'),
      timestamps: {
        schemaVersion: '1.0.0',
        allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
        totalDuration: 1,
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
      },
      duration: 1,
      wordCount: 1,
      voice: 'af_heart',
      sampleRate: 48000,
    });
    const visuals = {
      schemaVersion: '1.1.0',
      scenes: [
        {
          sceneId: 'scene-1',
          source: 'generated-nanobanana',
          assetPath: '/tmp/scene-1.png',
          duration: 1,
          assetType: 'image',
          motionStrategy: 'depthflow',
          motionApplied: false,
        },
      ],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 1,
    };
    matchVisualsMock.mockResolvedValue(visuals);

    const rewrittenVisuals = {
      ...visuals,
      scenes: [
        {
          ...visuals.scenes[0],
          assetType: 'video',
          motionStrategy: 'none',
          motionApplied: true,
          assetPath: '/tmp/media/scene-1-depthflow.mp4',
        },
      ],
    };
    applyMediaManifestToVisualsMock.mockReturnValue(rewrittenVisuals);

    renderVideoMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      outputPath,
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 123,
      codec: 'h264',
      archetype: 'listicle',
    });

    const { runPipeline } = await import('../../../src/core/pipeline');
    await runPipeline({
      topic: 'Redis',
      archetype: 'listicle',
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 10,
      outputPath,
      keepArtifacts: false,
      mock: true,
    });

    expect(synthesizeMediaManifestMock).toHaveBeenCalledTimes(1);
    expect(applyMediaManifestToVisualsMock).toHaveBeenCalledTimes(1);
    expect(renderVideoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        visuals: rewrittenVisuals,
      })
    );
  });

  it('skips media synthesis when explicitly disabled', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'video.mp4');

    generateScriptMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      reasoning: 'ok',
    });
    generateAudioMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      audioPath: path.join(dir, 'audio.wav'),
      timestampsPath: path.join(dir, 'timestamps.json'),
      timestamps: {
        schemaVersion: '1.0.0',
        allWords: [{ word: 'hello', start: 0.1, end: 0.3 }],
        totalDuration: 1,
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
      },
      duration: 1,
      wordCount: 1,
      voice: 'af_heart',
      sampleRate: 48000,
    });
    const visuals = {
      schemaVersion: '1.1.0',
      scenes: [
        {
          sceneId: 'scene-1',
          source: 'generated-nanobanana',
          assetPath: '/tmp/scene-1.png',
          duration: 1,
          assetType: 'image',
          motionStrategy: 'veo',
          motionApplied: false,
        },
      ],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 1,
    };
    matchVisualsMock.mockResolvedValue(visuals);

    renderVideoMock.mockResolvedValue({
      schemaVersion: '1.0.0',
      outputPath,
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 123,
      codec: 'h264',
      archetype: 'listicle',
    });

    const { runPipeline } = await import('../../../src/core/pipeline');
    await runPipeline({
      topic: 'Redis',
      archetype: 'listicle',
      orientation: 'portrait',
      voice: 'af_heart',
      targetDuration: 10,
      outputPath,
      keepArtifacts: false,
      mock: true,
      media: {
        enabled: false,
      },
    });

    expect(synthesizeMediaManifestMock).not.toHaveBeenCalled();
    expect(applyMediaManifestToVisualsMock).not.toHaveBeenCalled();
    expect(renderVideoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        visuals,
      })
    );
  });
});
