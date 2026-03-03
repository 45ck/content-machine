import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('SeedanceBytePlusAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves direct create response with output URL', async () => {
    fetchJsonWithTimeout.mockResolvedValueOnce({
      status: 'completed',
      video: { url: 'https://example.com/seedance.mp4' },
    });

    const { SeedanceBytePlusAdapter } =
      await import('../../../../../src/media/synthesis/adapters/seedance-byteplus');
    const adapter = new SeedanceBytePlusAdapter({
      apiKey: 'b-key',
      endpoint: 'https://byteplus.example.com/tasks',
    });

    const request: MediaSynthesisRequest = {
      kind: 'text-to-video',
      prompt: 'Ad spot sequence',
      durationSeconds: 6,
      width: 1080,
      height: 1920,
      outputPath: '/tmp/seedance.mp4',
    };
    const result = await adapter.submit(request);

    expect(result.outputPath).toBe('/tmp/seedance.mp4');
    expect(downloadToPath).toHaveBeenCalledWith({
      url: 'https://example.com/seedance.mp4',
      outputPath: '/tmp/seedance.mp4',
    });
  });

  it('polls running image-to-video jobs and resolves base64 output', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        data: { status: 'running', task_id: 'seed-job-1' },
      })
      .mockResolvedValueOnce({
        task: { status: 'succeeded' },
        data: { output_b64: 'AQID' },
      });

    const { SeedanceBytePlusAdapter } =
      await import('../../../../../src/media/synthesis/adapters/seedance-byteplus');
    const adapter = new SeedanceBytePlusAdapter({
      apiKey: 'b-key',
      endpoint: 'https://byteplus.example.com/tasks/',
      pollIntervalMs: 1,
      maxPollAttempts: 2,
    });

    const request: MediaSynthesisRequest = {
      kind: 'image-to-video',
      inputImagePath: '/tmp/input.png',
      durationSeconds: 5,
      width: 720,
      height: 1280,
      outputPath: '/tmp/seedance-polled.mp4',
    };
    const result = await adapter.submit(request);

    expect(fileToDataUrl).toHaveBeenCalledWith('/tmp/input.png');
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(writeBase64ToPath).toHaveBeenCalledWith({
      base64: 'AQID',
      outputPath: '/tmp/seedance-polled.mp4',
    });
    expect(result.outputPath).toBe('/tmp/seedance-polled.mp4');
  });

  it('throws when async response does not include a task id', async () => {
    fetchJsonWithTimeout.mockResolvedValueOnce({
      status: 'running',
    });

    const { SeedanceBytePlusAdapter } =
      await import('../../../../../src/media/synthesis/adapters/seedance-byteplus');
    const adapter = new SeedanceBytePlusAdapter({
      apiKey: 'b-key',
      endpoint: 'https://byteplus.example.com/tasks',
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

  it('throws when async job status returns failed', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        task_id: 'seed-job-2',
        status: 'running',
      })
      .mockResolvedValueOnce({
        status: 'failed',
      });

    const { SeedanceBytePlusAdapter } =
      await import('../../../../../src/media/synthesis/adapters/seedance-byteplus');
    const adapter = new SeedanceBytePlusAdapter({
      apiKey: 'b-key',
      endpoint: 'https://byteplus.example.com/tasks',
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

  it('throws when job does not complete within poll attempts', async () => {
    fetchJsonWithTimeout
      .mockResolvedValueOnce({
        id: 'seed-job-3',
        status: 'running',
      })
      .mockResolvedValueOnce({
        status: 'running',
      });

    const { SeedanceBytePlusAdapter } =
      await import('../../../../../src/media/synthesis/adapters/seedance-byteplus');
    const adapter = new SeedanceBytePlusAdapter({
      apiKey: 'b-key',
      endpoint: 'https://byteplus.example.com/tasks',
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
