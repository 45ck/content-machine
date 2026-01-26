import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const loadConfigMock = vi.fn();
const generateScriptMock = vi.fn();
const generateAudioMock = vi.fn();
const matchVisualsMock = vi.fn();
const renderVideoMock = vi.fn();

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

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cm-pipeline-test-'));
}

describe('core pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadConfigMock.mockReturnValue({
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
});
