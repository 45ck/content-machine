import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Evidence } from '../../domain';
import { BaseResearchTool } from './base-tool';
import type { SearchToolOptions } from './types';

class TestBaseTool extends BaseResearchTool<{ items: string[] }, string> {
  readonly source = 'web' as const;
  readonly name = 'Test Tool';
  available = true;

  readTotalCount(response: { items: string[] }, hitsLength: number): number {
    return this.getTotalCount(response, hitsLength);
  }

  override isAvailable(): boolean {
    return this.available;
  }

  protected buildUrl(query: string, _limit: number, _options: SearchToolOptions): string {
    return `https://example.com/search?q=${encodeURIComponent(query)}`;
  }

  protected buildHeaders(): Record<string, string> {
    return {};
  }

  protected extractHits(response: { items: string[] }): string[] {
    return response.items;
  }

  protected toEvidence(hit: string, index: number, total: number): Evidence {
    return {
      title: hit,
      url: `https://example.com/${index}`,
      source: this.source,
      summary: `${hit} (${index + 1}/${total})`,
      relevanceScore: 1 - index / Math.max(total, 1),
    };
  }
}

describe('BaseResearchTool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses hit length as the default total count', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: ['first', 'second', 'third'] }),
      })
    );

    const tool = new TestBaseTool();
    const result = await tool.search('redis');

    expect(result.success).toBe(true);
    expect(result.totalFound).toBe(3);
    expect(result.evidence).toHaveLength(3);
    expect(tool.readTotalCount({ items: ['only'] }, 1)).toBe(1);
  });

  it('uses the default unavailable message when the tool is unavailable', async () => {
    const tool = new TestBaseTool();
    tool.available = false;

    const result = await tool.search('redis');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Test Tool is not available');
    expect(result.searchTimeMs).toBeGreaterThan(0);
  });
});
