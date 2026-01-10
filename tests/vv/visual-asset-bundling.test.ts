/**
 * V&V tests for visual asset bundling plan.
 *
 * Goal: When visuals reference remote stock URLs, we should be able to map them
 * deterministically to bundle-relative `public/stock/*` paths (downloaded/cached
 * outside of tests).
 */
import { describe, expect, it } from 'vitest';
import { VISUALS_SCHEMA_VERSION, type VisualsOutputInput } from '../../src/visuals/schema';
import {
  buildVisualAssetBundlePlan,
  applyVisualAssetBundlePlan,
} from '../../src/render/assets/visual-asset-bundler';

describe('V&V: visual asset bundling', () => {
  it('creates a deterministic plan for remote scene URLs and rewrites visuals', () => {
    const visuals: VisualsOutputInput = {
      schemaVersion: VISUALS_SCHEMA_VERSION,
      scenes: [
        {
          sceneId: 'scene-001',
          source: 'stock-pexels',
          assetPath: 'https://example.com/video.mp4?x=1',
          duration: 2,
          matchReasoning: { reasoning: 'vv', conceptsMatched: ['vv'] },
        },
        {
          sceneId: 'scene-002',
          source: 'stock-pexels',
          assetPath: 'https://example.com/video.mp4?x=1',
          duration: 2,
          matchReasoning: { reasoning: 'vv', conceptsMatched: ['vv'] },
        },
      ],
      totalAssets: 2,
      fromUserFootage: 0,
      fromStock: 2,
      fallbacks: 0,
      keywords: [],
      totalDuration: 4,
    };

    const plan = buildVisualAssetBundlePlan(visuals);
    expect(plan.assets.length).toBe(1); // de-duped by URL
    expect(plan.assets[0].bundlePath.startsWith('stock/')).toBe(true);
    expect(plan.assets[0].bundlePath.endsWith('.mp4')).toBe(true);

    const rewritten = applyVisualAssetBundlePlan(visuals, plan);
    expect(rewritten.scenes[0].assetPath).toBe(plan.assets[0].bundlePath);
    expect(rewritten.scenes[1].assetPath).toBe(plan.assets[0].bundlePath);
  });
});

