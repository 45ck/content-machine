import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaSynthesisRequest } from '../../../../../src/media/synthesis/types';

const downloadToPath = vi.fn(async ({ outputPath }: { outputPath: string }) => outputPath);
const fetchJsonWithTimeout = vi.fn();
const fileToDataUrl = vi.fn(async () => 'data:image/jpeg;base64,AQID');
const sleep = vi.fn(async () => undefined);

vi.mock('../../../../../src/media/synthesis/http', () => ({
  downloadToPath,
  fetchJsonWithTimeout,
  fileToDataUrl,
  sleep,
}));

describe('GoogleVeoAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits text-to-video request and resolves completed operation output', async () => {
    fetchJsonWithTimeout.mockResolvedValueOnce({
      done: true,
      response: {
        generateVideoResponse: {
          generatedSamples: [{ video: { uri: 'https://example.com/veo.mp4' } }],
        },
      },
    });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      apiKey: 'g-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'veo-3.1-fast',
    });

    const request: MediaSynthesisRequest = {
      kind: 'text-to-video',
      prompt: 'Cinematic sunrise pan',
      durationSeconds: 6,
      width: 1080,
      height: 1920,
      outputPath: '/tmp/veo.mp4',
    };
    const result = await adapter.submit(request);

    expect(result.outputPath).toBe('/tmp/veo.mp4');
    expect(downloadToPath).toHaveBeenCalledWith({
      url: 'https://example.com/veo.mp4',
      outputPath: '/tmp/veo.mp4',
      headers: expect.objectContaining({ 'x-goog-api-key': 'g-key' }),
      timeoutMs: expect.any(Number),
    });
  });

  it('polls unfinished image-to-video operations and downloads video output', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        name: 'operations/veo-job-1',
      })
      .mockResolvedValueOnce({
        done: true,
        response: {
          generateVideoResponse: {
            generatedSamples: [{ video: { uri: 'https://example.com/veo-polled.mp4' } }],
          },
        },
      });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      apiKey: 'g-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      pollIntervalMs: 1,
      maxPollAttempts: 2,
    });

    const request: MediaSynthesisRequest = {
      kind: 'image-to-video',
      inputImagePath: '/tmp/input.jpg',
      durationSeconds: 5,
      width: 720,
      height: 1280,
      outputPath: '/tmp/veo-polled.mp4',
    };
    const result = await adapter.submit(request);

    expect(fileToDataUrl).toHaveBeenCalledWith('/tmp/input.jpg');
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(downloadToPath).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/veo-polled.mp4',
        outputPath: '/tmp/veo-polled.mp4',
        headers: expect.objectContaining({ 'x-goog-api-key': 'g-key' }),
      })
    );
    expect(result.outputPath).toBe('/tmp/veo-polled.mp4');
  });

  it('throws when async creation response lacks operation name', async () => {
    fetchJsonWithTimeout.mockResolvedValueOnce({
      done: false,
    });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      apiKey: 'g-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
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
    ).rejects.toThrow(/did not include operation name/);
  });

  it('throws when polled operation contains an error', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        name: 'operations/veo-job-2',
      })
      .mockResolvedValueOnce({
        done: true,
        error: { message: 'cancelled' },
      });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      apiKey: 'g-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
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
    ).rejects.toThrow(/operation failed/i);
  });
});
