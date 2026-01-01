/**
 * Step 3: Asset Capture (Deterministic)
 *
 * Gathers all assets needed for video:
 * - TTS voiceover (Kokoro)
 * - Product UI captures (Playwright)
 * - Stock footage (Pexels)
 *
 * Each asset gets a UUID and is registered.
 */

import { v4 as uuid } from 'uuid';
import type { Script, Asset } from '../types/index.js';

export class AssetCaptureStep {
  private assets: Map<string, Asset> = new Map();

  async execute(script: Script): Promise<Asset[]> {
    console.log(`[Step 3] Capturing assets for ${script.scenes.length} scenes...`);

    const assets: Asset[] = [];

    // Generate voiceover for all scenes
    const voiceoverAsset = await this.generateVoiceover(script);
    assets.push(voiceoverAsset);

    // Process each scene's asset hints
    for (const scene of script.scenes) {
      const hints = scene.assetHints || [];

      for (const hint of hints) {
        if (hint.startsWith('product-ui:')) {
          const scenario = hint.replace('product-ui:', '');
          const asset = await this.captureProductUI(scenario);
          assets.push(asset);
        } else if (hint.startsWith('pexels:')) {
          const query = hint.replace('pexels:', '');
          const asset = await this.fetchPexelsVideo(query);
          assets.push(asset);
        }
        // text-overlay handled in render step
      }
    }

    console.log(`[Step 3] Captured ${assets.length} assets`);
    return assets;
  }

  /**
   * Generate TTS voiceover using Kokoro (placeholder)
   */
  private async generateVoiceover(script: Script): Promise<Asset> {
    console.log('[Step 3] Generating voiceover (mock)...');

    // Combine all voiceover text
    const fullText = script.scenes.map((s) => s.voiceover).join(' ');

    // TODO: Replace with actual Kokoro TTS
    // const audio = await kokoro.synthesize(fullText, { voice: 'default' });

    const asset: Asset = {
      id: uuid(),
      type: 'voiceover',
      path: `/tmp/voiceover-${script.id}.mp3`, // Mock path
      duration: script.totalDuration,
      source: 'kokoro:default',
      license: 'generated',
      attributionRequired: false,
      createdAt: new Date(),
    };

    this.assets.set(asset.id, asset);
    return asset;
  }

  /**
   * Capture product UI with Playwright (placeholder)
   */
  private async captureProductUI(scenario: string): Promise<Asset> {
    console.log(`[Step 3] Capturing product UI: ${scenario} (mock)...`);

    // TODO: Replace with actual Playwright capture
    // See Product Capture Contract in ADR-023

    const asset: Asset = {
      id: uuid(),
      type: 'product-capture',
      path: `/tmp/capture-${scenario}-${Date.now()}.mp4`,
      duration: 5, // Default capture duration
      source: `playwright:${scenario}`,
      license: 'proprietary',
      attributionRequired: false,
      createdAt: new Date(),
    };

    this.assets.set(asset.id, asset);
    return asset;
  }

  /**
   * Fetch stock video from Pexels (placeholder)
   */
  private async fetchPexelsVideo(query: string): Promise<Asset> {
    console.log(`[Step 3] Fetching Pexels video: ${query} (mock)...`);

    // TODO: Replace with actual Pexels API
    // const video = await pexels.videos.search({ query, per_page: 1 });

    const asset: Asset = {
      id: uuid(),
      type: 'pexels-video',
      path: `/tmp/pexels-${query}-${Date.now()}.mp4`,
      duration: 10,
      source: `pexels:mock-${query}`,
      license: 'pexels',
      attributionRequired: true, // Pexels requires attribution
      createdAt: new Date(),
    };

    this.assets.set(asset.id, asset);
    return asset;
  }

  /**
   * Get asset by ID
   */
  getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }
}
