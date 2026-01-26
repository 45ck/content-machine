import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CMError } from '../../../src/core/errors';
import { buildVisualAssetBundlePlan } from '../../../src/render/assets/visual-asset-bundler';

const bundleMock = vi.fn();
const selectCompositionMock = vi.fn();
const renderMediaMock = vi.fn();
const probeVideoWithFfprobeMock = vi.fn();
const downloadRemoteAssetsToCacheMock = vi.fn();

vi.mock('@remotion/bundler', () => ({
  bundle: bundleMock,
}));

vi.mock('@remotion/renderer', () => ({
  selectComposition: selectCompositionMock,
  renderMedia: renderMediaMock,
}));

vi.mock('../../../src/validate/ffprobe', () => ({
  probeVideoWithFfprobe: probeVideoWithFfprobeMock,
}));

vi.mock('../../../src/render/assets/remote-assets', () => ({
  downloadRemoteAssetsToCache: downloadRemoteAssetsToCacheMock,
}));

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cm-render-test-'));
}

function writeBigFile(filePath: string, bytes = 12 * 1024): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.alloc(bytes, 1));
}

describe('render service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CM_REMOTION_CONCURRENCY;

    bundleMock.mockResolvedValue(makeTempDir());
    selectCompositionMock.mockResolvedValue({
      id: 'ShortVideo',
      durationInFrames: 30,
      width: 1080,
      height: 1920,
      fps: 30,
    });
    renderMediaMock.mockImplementation(async ({ outputLocation }) => {
      writeBigFile(outputLocation, 9 * 1024);
    });
    probeVideoWithFfprobeMock.mockResolvedValue({
      path: 'video.mp4',
      width: 1080,
      height: 1920,
      durationSeconds: 1,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
    });
    downloadRemoteAssetsToCacheMock.mockResolvedValue({
      extraAssets: [],
      succeededUrls: new Set(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves caption font assets and derives a family from file name', async () => {
    const dir = makeTempDir();
    const fontPath = path.join(dir, 'My_Custom-Font.ttf');
    fs.writeFileSync(fontPath, 'font');

    const { resolveCaptionFontAssets } = await import('../../../src/render/service');
    const resolved = resolveCaptionFontAssets({
      visuals: { scenes: [], totalAssets: 0, fromUserFootage: 0, fromStock: 0, fallbacks: 0 },
      timestamps: { allWords: [], totalDuration: 1, ttsEngine: 'kokoro', asrEngine: 'whisper' },
      audioPath: 'audio.wav',
      outputPath: 'out.mp4',
      orientation: 'portrait',
      captionFontFile: fontPath,
      fonts: [{ family: 'Inter', src: 'https://example.com/inter.woff2' }],
    });

    expect(resolved.captionFontFamily).toBe('My Custom Font');
    expect(resolved.fontAssets[0]?.destPath).toBe(`fonts/${path.basename(fontPath)}`);
    expect(resolved.fontSources.some((font) => font.family === 'Inter')).toBe(true);
  });

  it('throws when a caption font file is missing', async () => {
    const { resolveCaptionFontAssets } = await import('../../../src/render/service');
    expect(() =>
      resolveCaptionFontAssets({
        visuals: { scenes: [], totalAssets: 0, fromUserFootage: 0, fromStock: 0, fallbacks: 0 },
        timestamps: { allWords: [], totalDuration: 1, ttsEngine: 'kokoro', asrEngine: 'whisper' },
        audioPath: 'audio.wav',
        outputPath: 'out.mp4',
        orientation: 'portrait',
        captionFontFile: '/does/not/exist.ttf',
      })
    ).toThrowError(/Caption font file not found/);
  });

  it('returns a mock render output when mock mode is enabled (ffprobe optional)', async () => {
    const dir = makeTempDir();
    const outputPath = path.join(dir, 'mock.mp4');

    probeVideoWithFfprobeMock.mockRejectedValueOnce(
      new CMError('DEPENDENCY_MISSING', 'ffprobe missing')
    );

    const { renderVideo } = await import('../../../src/render/service');
    const output = await renderVideo({
      visuals: {
        scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'clip.mp4', duration: 1 }],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 0,
        fallbacks: 0,
        fromGenerated: 0,
      },
      timestamps: {
        allWords: [{ word: 'hello', start: 0.1, end: 0.2 }],
        totalDuration: 1,
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
      },
      audioPath: 'audio.wav',
      outputPath,
      orientation: 'portrait',
      mock: true,
    });

    expect(output.outputPath).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it('bundles assets and renders with mocked Remotion when mockRenderMode is real', async () => {
    const dir = makeTempDir();
    const audioPath = path.join(dir, 'audio.wav');
    writeBigFile(audioPath, 9 * 1024);

    const localVisualPath = path.join(dir, 'local.mp4');
    writeBigFile(localVisualPath);

    const gameplayPath = path.join(dir, 'gameplay.mp4');
    writeBigFile(gameplayPath);

    const hookPath = path.join(dir, 'hook.mp4');
    writeBigFile(hookPath);

    const fontPath = path.join(dir, 'CustomFont.ttf');
    fs.writeFileSync(fontPath, 'font');

    const remoteUrl = 'https://example.com/stock.mp4';
    const visualsInput = {
      scenes: [
        { sceneId: 'scene-remote', source: 'stock-pexels', assetPath: remoteUrl, duration: 1 },
        { sceneId: 'scene-local', source: 'user-footage', assetPath: localVisualPath, duration: 1 },
      ],
      totalAssets: 2,
      fromUserFootage: 1,
      fromStock: 1,
      fallbacks: 0,
      fromGenerated: 0,
      gameplayClip: { path: gameplayPath, duration: 2, width: 1080, height: 1920 },
    };

    const plan = buildVisualAssetBundlePlan(visualsInput as never);
    const remoteBundlePath = plan.assets.find((asset) => asset.sourceUrl)?.bundlePath;
    const downloadedPath = path.join(dir, 'downloaded.mp4');
    writeBigFile(downloadedPath);

    downloadRemoteAssetsToCacheMock.mockResolvedValueOnce({
      extraAssets: remoteBundlePath
        ? [{ sourcePath: downloadedPath, destPath: remoteBundlePath }]
        : [],
      succeededUrls: new Set([remoteUrl]),
    });

    const outputPath = path.join(dir, 'out.mp4');

    process.env.CM_REMOTION_CONCURRENCY = '4';

    const onProgress = vi.fn(() => {
      throw new Error('progress should be safe');
    });

    const { renderVideo } = await import('../../../src/render/service');
    const output = await renderVideo({
      visuals: visualsInput as never,
      timestamps: {
        allWords: [{ word: 'hello', start: 0.1, end: 0.2 }],
        totalDuration: 1,
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
      },
      audioPath,
      outputPath,
      orientation: 'portrait',
      mock: true,
      mockRenderMode: 'real',
      hook: { path: hookPath, duration: 0.5 },
      captionFontFile: fontPath,
      captionFillerWords: ['um'],
      captionDropListMarkers: true,
      captionConfig: { fontFamily: 'Inter', layout: { maxWordsPerPage: 5 } },
      onProgress,
    });

    expect(output.outputPath).toBe(outputPath);
    expect(renderMediaMock).toHaveBeenCalledWith(expect.objectContaining({ concurrency: 4 }));
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(downloadRemoteAssetsToCacheMock).toHaveBeenCalled();
    expect(selectCompositionMock).toHaveBeenCalled();
  });

  it('skips local video validation when ffprobe is missing', async () => {
    const dir = makeTempDir();
    const audioPath = path.join(dir, 'audio.wav');
    writeBigFile(audioPath, 9 * 1024);

    const localVisualPath = path.join(dir, 'local.mp4');
    writeBigFile(localVisualPath);

    probeVideoWithFfprobeMock.mockRejectedValueOnce(
      new CMError('DEPENDENCY_MISSING', 'ffprobe missing')
    );

    const { renderVideo } = await import('../../../src/render/service');
    await expect(
      renderVideo({
        visuals: {
          scenes: [
            {
              sceneId: 'scene-local',
              source: 'user-footage',
              assetPath: localVisualPath,
              duration: 1,
            },
          ],
          totalAssets: 1,
          fromUserFootage: 1,
          fromStock: 0,
          fallbacks: 0,
          fromGenerated: 0,
        },
        timestamps: {
          allWords: [{ word: 'hello', start: 0.1, end: 0.2 }],
          totalDuration: 1,
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        },
        audioPath,
        outputPath: path.join(dir, 'out.mp4'),
        orientation: 'portrait',
        mock: true,
        mockRenderMode: 'real',
      })
    ).resolves.toBeTruthy();
  });

  it('fails fast when a local visual asset path does not exist', async () => {
    const dir = makeTempDir();
    const audioPath = path.join(dir, 'audio.wav');
    writeBigFile(audioPath, 9 * 1024);

    const { renderVideo } = await import('../../../src/render/service');
    await expect(
      renderVideo({
        visuals: {
          scenes: [
            {
              sceneId: 'scene-local',
              source: 'user-footage',
              assetPath: path.join(dir, 'missing.mp4'),
              duration: 1,
            },
          ],
          totalAssets: 1,
          fromUserFootage: 1,
          fromStock: 0,
          fallbacks: 0,
          fromGenerated: 0,
        },
        timestamps: {
          allWords: [{ word: 'hello', start: 0.1, end: 0.2 }],
          totalDuration: 1,
          ttsEngine: 'kokoro',
          asrEngine: 'whisper',
        },
        audioPath,
        outputPath: path.join(dir, 'out.mp4'),
        orientation: 'portrait',
        mock: true,
        mockRenderMode: 'real',
      })
    ).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' });
  });

  it('does not download remote assets when downloadAssets is disabled', async () => {
    const dir = makeTempDir();
    const audioPath = path.join(dir, 'audio.wav');
    writeBigFile(audioPath, 9 * 1024);

    const outputPath = path.join(dir, 'out.mp4');
    const { renderVideo } = await import('../../../src/render/service');
    await renderVideo({
      visuals: {
        scenes: [
          {
            sceneId: 'scene-remote',
            source: 'stock-pexels',
            assetPath: 'https://example.com/stock.mp4',
            duration: 1,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 1,
        fallbacks: 0,
        fromGenerated: 0,
      },
      timestamps: {
        allWords: [{ word: 'hello', start: 0.1, end: 0.2 }],
        totalDuration: 1,
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
      },
      audioPath,
      outputPath,
      orientation: 'portrait',
      mock: true,
      mockRenderMode: 'real',
      downloadAssets: false,
    });

    expect(downloadRemoteAssetsToCacheMock).not.toHaveBeenCalled();
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});
