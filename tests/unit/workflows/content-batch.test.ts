import path from 'path';
import { describe, expect, it } from 'vitest';
import { ContentBatchSchema, loadContentBatch } from '../../../src/workflows/content-batch';

describe('workflow content batches', () => {
  it('loads the shipped high-hook review batch fixture', async () => {
    const batch = await loadContentBatch(
      path.resolve('test-fixtures/generate/high-hook-review-batch-20260306.json')
    );

    expect(batch.id).toBe('high-hook-review-batch-20260306');
    expect(batch.items).toHaveLength(5);
    expect(batch.items.map((item) => item.workflow)).toEqual(
      expect.arrayContaining([
        'brainrot-gameplay',
        'gemini-meme-explainer',
        'absurdist-edutainment',
        'clean-educational-control',
      ])
    );
  });

  it('requires at least one batch item', () => {
    const parsed = ContentBatchSchema.safeParse({
      schemaVersion: '1.0.0',
      id: 'empty-batch',
      name: 'Empty batch',
      items: [],
    });

    expect(parsed.success).toBe(false);
  });
});
