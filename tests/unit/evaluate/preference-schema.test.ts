import { describe, it, expect } from 'vitest';

describe('PreferenceRecordSchema', () => {
  it('validates a valid preference record', async () => {
    const { PreferenceRecordSchema } = await import('../../../src/evaluate/preference-schema');

    const record = {
      videoA: '/tmp/video1.mp4',
      videoB: '/tmp/video2.mp4',
      winner: 'A',
      dimensions: ['quality', 'engagement'],
      annotator: 'alice',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = PreferenceRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
  });

  it('validates tie as winner', async () => {
    const { PreferenceRecordSchema } = await import('../../../src/evaluate/preference-schema');

    const record = {
      videoA: '/tmp/video1.mp4',
      videoB: '/tmp/video2.mp4',
      winner: 'tie',
      dimensions: ['quality'],
      annotator: 'bob',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = PreferenceRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
  });

  it('rejects invalid winner value', async () => {
    const { PreferenceRecordSchema } = await import('../../../src/evaluate/preference-schema');

    const record = {
      videoA: '/tmp/video1.mp4',
      videoB: '/tmp/video2.mp4',
      winner: 'C',
      dimensions: ['quality'],
      annotator: 'charlie',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = PreferenceRecordSchema.safeParse(record);
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', async () => {
    const { PreferenceRecordSchema } = await import('../../../src/evaluate/preference-schema');

    const record = {
      videoA: '/tmp/video1.mp4',
      winner: 'A',
      annotator: 'dave',
    };

    const result = PreferenceRecordSchema.safeParse(record);
    expect(result.success).toBe(false);
  });

  it('validates empty dimensions array', async () => {
    const { PreferenceRecordSchema } = await import('../../../src/evaluate/preference-schema');

    const record = {
      videoA: '/tmp/video1.mp4',
      videoB: '/tmp/video2.mp4',
      winner: 'B',
      dimensions: [],
      annotator: 'eve',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = PreferenceRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
  });

  it('validates multiple dimensions', async () => {
    const { PreferenceRecordSchema } = await import('../../../src/evaluate/preference-schema');

    const record = {
      videoA: '/tmp/video1.mp4',
      videoB: '/tmp/video2.mp4',
      winner: 'A',
      dimensions: ['quality', 'engagement', 'creativity', 'coherence'],
      annotator: 'frank',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = PreferenceRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
  });
});
