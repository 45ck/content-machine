import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaSynthesisRequest } from '../../../../../src/media/synthesis/types';

const downloadToPath = vi.fn(async ({ outputPath }: { outputPath: string }) => outputPath);
const fetchJsonWithTimeout = vi.fn();
const fileToDataUrl = vi.fn(async () => 'data:image/jpeg;base64,AQID');
const sleep = vi.fn(async () => undefined);
const writeBase64ToPath = vi.fn(async ({ outputPath }: { outputPath: string }) => outputPath);

vi.mock('../../../../../src/media/synthesis/http', () => ({
  downloadToPath,
  fetchJsonWithTimeout,
  fileToDataUrl,
  sleep,
  writeBase64ToPath,
}));

describe('GoogleVeoAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits text-to-video request and resolves direct output URL', async () => {
    fetchJsonWithTimeout.mockResolvedValueOnce({
      status: 'completed',
      outputUrl: 'https://example.com/veo.mp4',
    });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      apiKey: 'g-key',
      endpoint: 'https://veo.example.com/jobs',
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
    });
  });

  it('polls running image-to-video jobs and resolves base64 output', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        status: 'running',
        jobId: 'veo-job-1',
      })
      .mockResolvedValueOnce({
        status: 'succeeded',
        videoBase64: 'AQID',
      });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      apiKey: 'g-key',
      endpoint: 'https://veo.example.com/jobs?region=us',
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
    expect(writeBase64ToPath).toHaveBeenCalledWith({
      base64: 'AQID',
      outputPath: '/tmp/veo-polled.mp4',
    });
    expect(result.outputPath).toBe('/tmp/veo-polled.mp4');
  });

  it('throws when async creation response lacks job id', async () => {
    fetchJsonWithTimeout.mockResolvedValueOnce({
      status: 'running',
    });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      apiKey: 'g-key',
      endpoint: 'https://veo.example.com/jobs',
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
    ).rejects.toThrow(/did not include job id/);
  });

  it('throws when polled status is cancelled', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        status: 'running',
        id: 'veo-job-2',
      })
      .mockResolvedValueOnce({
        status: 'cancelled',
      });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      apiKey: 'g-key',
      endpoint: 'https://veo.example.com/jobs',
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
    ).rejects.toThrow(/ended with status "cancelled"/);
  });
});
