import { describe, it, expect } from 'vitest';
import { MediaSynthesisOrchestrator } from '../../../../src/media/synthesis/orchestrator';

describe('MediaSynthesisOrchestrator', () => {
  it('runs synthesis jobs and records success', async () => {
    const orchestrator = new MediaSynthesisOrchestrator([
      {
        name: 'test-i2v',
        capabilities: ['image-to-video'],
        submit: async () => ({ outputPath: '/tmp/out.mp4' }),
      },
    ]);

    const job = await orchestrator.runJob({
      adapterName: 'test-i2v',
      request: {
        kind: 'image-to-video',
        inputImagePath: '/tmp/in.png',
        durationSeconds: 3,
        width: 1080,
        height: 1920,
        outputPath: '/tmp/out.mp4',
      },
    });

    expect(job.status).toBe('succeeded');
    expect(job.result?.outputPath).toBe('/tmp/out.mp4');
    expect(orchestrator.getJob(job.id)?.status).toBe('succeeded');
  });

  it('fails fast when adapter lacks capability', async () => {
    const orchestrator = new MediaSynthesisOrchestrator([
      {
        name: 'test-i2v',
        capabilities: ['image-to-video'],
        submit: async () => ({ outputPath: '/tmp/out.mp4' }),
      },
    ]);

    await expect(
      orchestrator.runJob({
        adapterName: 'test-i2v',
        request: {
          kind: 'text-to-video',
          prompt: 'a neon city',
          durationSeconds: 3,
          width: 1080,
          height: 1920,
          outputPath: '/tmp/out.mp4',
        },
      })
    ).rejects.toThrow('does not support');
  });
});
