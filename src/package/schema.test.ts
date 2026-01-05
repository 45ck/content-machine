/**
 * Package Schemas Tests
 */
import { describe, it, expect } from 'vitest';
import { PACKAGE_SCHEMA_VERSION, PackageOutputSchema } from './schema';

describe('PackageOutputSchema', () => {
  it('should validate a correct package output', () => {
    const output = {
      schemaVersion: PACKAGE_SCHEMA_VERSION,
      topic: 'Redis vs PostgreSQL for caching',
      platform: 'tiktok',
      variants: [
        {
          title: 'Redis vs Postgres: Which one is ACTUALLY faster for caching?',
          coverText: 'Redis vs Postgres',
          onScreenHook: 'Stop scrolling: caching mistake',
        },
      ],
      selectedIndex: 0,
      selected: {
        title: 'Redis vs Postgres: Which one is ACTUALLY faster for caching?',
        coverText: 'Redis vs Postgres',
        onScreenHook: 'Stop scrolling: caching mistake',
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };

    const result = PackageOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = PackageOutputSchema.safeParse({
      schemaVersion: PACKAGE_SCHEMA_VERSION,
      topic: 'Test',
      platform: 'tiktok',
      // missing variants, selected, selectedIndex
    });
    expect(result.success).toBe(false);
  });
});
