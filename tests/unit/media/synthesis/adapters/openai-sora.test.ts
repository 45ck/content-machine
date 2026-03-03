import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaSynthesisRequest } from '../../../../../src/media/synthesis/types';

const downloadToPath = vi.fn(async ({ outputPath }: { outputPath: string }) => outputPath);
const fetchJsonWithTimeout = vi.fn();
const fileToDataUrl = vi.fn(async () => 'data:image/png;base64,AQID');
const sleep = vi.fn(async () => undefined);
const writeBase64ToPath = vi.fn(async ({ outputPath }: { outputPath: string }) => outputPath);

vi.mock('../../../../../src/media/synthesis/http', () => ({
  downloadToPath,
  fetchJsonWithTimeout,
  fileToDataUrl,
  sleep,
  writeBase64ToPath,
}));

describe('OpenAISoraAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns downloaded output when create call succeeds immediately', async () => {
    fetchJsonWithTimeout.mockResolvedValueOnce({
      status: 'succeeded',
      output: [{ url: 'https://example.com/clip.mp4' }],
    });

    const { OpenAISoraAdapter } =
      await import('../../../../../src/media/synthesis/adapters/openai-sora');
    const adapter = new OpenAISoraAdapter({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.com/v1/videos',
    });

    const request: MediaSynthesisRequest = {
      kind: 'text-to-video',
      prompt: 'A kinetic city montage',
      durationSeconds: 6,
      width: 1080,
      height: 1920,
      outputPath: '/tmp/out.mp4',
    };
    const result = await adapter.submit(request);

    expect(result.outputPath).toBe('/tmp/out.mp4');
    expect(downloadToPath).toHaveBeenCalledWith({
      url: 'https://example.com/clip.mp4',
      outputPath: '/tmp/out.mp4',
    });
  });

  it('polls async jobs and accepts base64 output', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        id: 'job-1',
        status: 'running',
      })
      .mockResolvedValueOnce({
        status: 'completed',
        data: [{ b64_json: 'AQID' }],
      });

    const { OpenAISoraAdapter } =
      await import('../../../../../src/media/synthesis/adapters/openai-sora');
    const adapter = new OpenAISoraAdapter({
      apiKey: 'test-key',
      pollIntervalMs: 1,
      maxPollAttempts: 2,
    });

    const request: MediaSynthesisRequest = {
      kind: 'image-to-video',
      inputImagePath: '/tmp/image.png',
      prompt: 'Animate softly',
      durationSeconds: 4,
      width: 720,
      height: 1280,
      outputPath: '/tmp/polled.mp4',
    };
    const result = await adapter.submit(request);

    expect(fileToDataUrl).toHaveBeenCalledWith('/tmp/image.png');
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(writeBase64ToPath).toHaveBeenCalledWith({
      base64: 'AQID',
      outputPath: '/tmp/polled.mp4',
    });
    expect(result.outputPath).toBe('/tmp/polled.mp4');
  });

  it('throws when async creation does not include job id', async () => {
    fetchJsonWithTimeout.mockResolvedValueOnce({
      status: 'running',
    });

    const { OpenAISoraAdapter } =
      await import('../../../../../src/media/synthesis/adapters/openai-sora');
    const adapter = new OpenAISoraAdapter({
      apiKey: 'test-key',
      maxPollAttempts: 1,
    });

    await expect(
      adapter.submit({
        kind: 'text-to-video',
        prompt: 'Prompt',
        durationSeconds: 4,
        width: 720,
        height: 1280,
        outputPath: '/tmp/out.mp4',
      })
    ).rejects.toThrow(/did not include a job id/);
  });

  it('throws when polled job reports failed state', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        id: 'job-2',
        status: 'running',
      })
      .mockResolvedValueOnce({
        status: 'failed',
      });

    const { OpenAISoraAdapter } =
      await import('../../../../../src/media/synthesis/adapters/openai-sora');
    const adapter = new OpenAISoraAdapter({
      apiKey: 'test-key',
      pollIntervalMs: 1,
      maxPollAttempts: 1,
    });

    await expect(
      adapter.submit({
        kind: 'text-to-video',
        prompt: 'Prompt',
        durationSeconds: 4,
        width: 720,
        height: 1280,
        outputPath: '/tmp/out.mp4',
      })
    ).rejects.toThrow(/ended with status "failed"/);
  });

  it('throws when job does not complete in configured attempts', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        id: 'job-3',
        status: 'running',
      })
      .mockResolvedValueOnce({
        status: 'running',
      });

    const { OpenAISoraAdapter } =
      await import('../../../../../src/media/synthesis/adapters/openai-sora');
    const adapter = new OpenAISoraAdapter({
      apiKey: 'test-key',
      pollIntervalMs: 1,
      maxPollAttempts: 1,
    });

    await expect(
      adapter.submit({
        kind: 'text-to-video',
        prompt: 'Prompt',
        durationSeconds: 4,
        width: 720,
        height: 1280,
        outputPath: '/tmp/out.mp4',
      })
    ).rejects.toThrow(/did not complete within 1 poll attempts/);
  });
});
