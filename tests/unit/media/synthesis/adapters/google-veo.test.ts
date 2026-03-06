import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaSynthesisRequest } from '../../../../../src/media/synthesis/types';

const downloadToPath = vi.fn(async ({ outputPath }: { outputPath: string }) => outputPath);
const fetchJsonWithTimeout = vi.fn();
const fileToDataUrl = vi.fn(async () => 'data:image/jpeg;base64,AQID');
const sleep = vi.fn(async () => undefined);
const writeBase64ToPath = vi.fn(async ({ outputPath }: { outputPath: string }) => outputPath);
const getGoogleAccessToken = vi.fn(async () => 'cloud-token');

vi.mock('../../../../../src/media/synthesis/http', () => ({
  downloadToPath,
  fetchJsonWithTimeout,
  fileToDataUrl,
  sleep,
  writeBase64ToPath,
}));

vi.mock('../../../../../src/media/synthesis/google-auth', () => ({
  getGoogleAccessToken,
}));

describe('GoogleVeoAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits legacy text-to-video request and resolves completed output', async () => {
    fetchJsonWithTimeout.mockResolvedValueOnce({
      status: 'completed',
      outputUrl: 'https://example.com/veo.mp4',
    });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      apiKey: 'g-key',
      endpoint: 'https://example.com/veo',
      model: 'veo-legacy',
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

    expect(fetchJsonWithTimeout).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/veo?key=g-key',
      })
    );
    expect(downloadToPath).toHaveBeenCalledWith({
      url: 'https://example.com/veo.mp4',
      outputPath: '/tmp/veo.mp4',
    });
    expect(result.outputPath).toBe('/tmp/veo.mp4');
  });

  it('polls Vertex image-to-video operations and writes inline bytes', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        name: 'operations/veo-job-1',
      })
      .mockResolvedValueOnce({
        done: true,
        response: {
          videos: [{ bytesBase64Encoded: 'AQID' }],
        },
      });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      vertexProject: 'demo-project',
      vertexLocation: 'us-central1',
      accessToken: 'vertex-token',
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
    expect(fetchJsonWithTimeout).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: 'https://us-central1-aiplatform.googleapis.com/v1/projects/demo-project/locations/us-central1/publishers/google/models/veo-3.1-generate-preview:predictLongRunning',
        init: expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer vertex-token' }),
        }),
      })
    );
    expect(fetchJsonWithTimeout).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: 'https://us-central1-aiplatform.googleapis.com/v1/projects/demo-project/locations/us-central1/publishers/google/models/veo-3.1-generate-preview:fetchPredictOperation',
      })
    );
    expect(writeBase64ToPath).toHaveBeenCalledWith({
      base64: 'AQID',
      outputPath: '/tmp/veo-polled.mp4',
    });
    expect(result.outputPath).toBe('/tmp/veo-polled.mp4');
  });

  it('falls back to auth helper for Vertex access token when not provided', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        name: 'operations/veo-job-2',
      })
      .mockResolvedValueOnce({
        done: true,
        response: {
          videos: [{ bytesBase64Encoded: 'AQID' }],
        },
      });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      vertexProject: 'demo-project',
      vertexLocation: 'us-central1',
      pollIntervalMs: 1,
      maxPollAttempts: 1,
    });

    await adapter.submit({
      kind: 'text-to-video',
      prompt: 'Prompt',
      durationSeconds: 4,
      width: 720,
      height: 1280,
      outputPath: '/tmp/out.mp4',
    });

    expect(getGoogleAccessToken).toHaveBeenCalled();
  });

  it('throws when Vertex operation contains an error', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        name: 'operations/veo-job-3',
      })
      .mockResolvedValueOnce({
        done: true,
        error: { message: 'cancelled' },
      });

    const { GoogleVeoAdapter } =
      await import('../../../../../src/media/synthesis/adapters/google-veo');
    const adapter = new GoogleVeoAdapter({
      vertexProject: 'demo-project',
      accessToken: 'vertex-token',
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
