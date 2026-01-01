/**
 * Step 4: Video Render (Deterministic)
 *
 * Builds Scene JSON from script + assets, then renders with Remotion.
 * Also generates captions using Whisper.
 */

import { v4 as uuid } from 'uuid';
import type { Script, Asset, SceneJSON, SceneJSONLayer } from '../types/index.js';
import { SCENE_JSON_LIMITS } from '../types/index.js';

export class VideoRenderStep {
  async execute(
    script: Script,
    assets: Asset[]
  ): Promise<{ sceneJson: SceneJSON; previewPath: string }> {
    console.log('[Step 4] Building scene JSON...');

    // Validate limits
    if (script.scenes.length > SCENE_JSON_LIMITS.maxScenes) {
      throw new Error(`Too many scenes: ${script.scenes.length} > ${SCENE_JSON_LIMITS.maxScenes}`);
    }
    if (script.totalDuration > SCENE_JSON_LIMITS.maxDuration) {
      throw new Error(`Duration too long: ${script.totalDuration}s > ${SCENE_JSON_LIMITS.maxDuration}s`);
    }

    const sceneJson = this.buildSceneJSON(script, assets);

    // Generate captions
    const captions = await this.generateCaptions(script, assets);
    sceneJson.captions = captions;

    console.log('[Step 4] Rendering with Remotion (mock)...');

    // TODO: Replace with actual Remotion render
    // const { bundle } = await bundle('./src/remotion/index.ts');
    // await renderMedia({ ... });

    const previewPath = `/tmp/preview-${sceneJson.id}.mp4`;

    console.log(`[Step 4] Render complete: ${previewPath}`);

    return { sceneJson, previewPath };
  }

  /**
   * Build Scene JSON from script and assets
   * Uses asset UUIDs as refs (not paths) for security
   */
  private buildSceneJSON(script: Script, assets: Asset[]): SceneJSON {
    const fps = 30;
    let currentFrame = 0;

    // Create asset lookup
    const assetBySource = new Map<string, Asset>();
    for (const asset of assets) {
      assetBySource.set(asset.source, asset);
    }

    // Find voiceover asset
    const voiceover = assets.find((a) => a.type === 'voiceover');

    const scenes = script.scenes.map((scene) => {
      const durationFrames = scene.duration * fps;
      const startFrame = currentFrame;
      currentFrame += durationFrames;

      const layers: SceneJSONLayer[] = [];

      // Add voiceover layer
      if (voiceover) {
        layers.push({
          type: 'voiceover',
          assetRef: voiceover.id,
          startFrame,
          durationFrames,
        });
      }

      // Add visual layers based on hints
      const hints = scene.assetHints || [];
      for (const hint of hints) {
        // Find matching asset
        for (const asset of assets) {
          if (asset.source.includes(hint.split(':')[1] || '')) {
            layers.push({
              type: asset.type === 'pexels-video' ? 'video' : 'video',
              assetRef: asset.id, // UUID ref, not path
              startFrame,
              durationFrames,
            });
            break;
          }
        }
      }

      return {
        number: scene.number,
        startFrame,
        durationFrames,
        layers,
      };
    });

    return {
      id: uuid(),
      scriptId: script.id,
      fps,
      width: 1080,
      height: 1920,
      scenes,
      createdAt: new Date(),
    };
  }

  /**
   * Generate word-level captions using Whisper (placeholder)
   */
  private async generateCaptions(
    script: Script,
    assets: Asset[]
  ): Promise<SceneJSON['captions']> {
    console.log('[Step 4] Generating captions (mock)...');

    // TODO: Replace with actual Whisper transcription
    // const voiceover = assets.find(a => a.type === 'voiceover');
    // const transcript = await whisper.transcribe(voiceover.path);

    const fps = 30;
    const captions: NonNullable<SceneJSON['captions']> = [];
    let frameOffset = 0;

    for (const scene of script.scenes) {
      // Simple word-by-word captions (mock)
      const words = scene.voiceover.split(' ');
      const framesPerWord = Math.floor((scene.duration * fps) / words.length);

      for (let i = 0; i < words.length; i++) {
        captions.push({
          text: words[i],
          startFrame: frameOffset + i * framesPerWord,
          endFrame: frameOffset + (i + 1) * framesPerWord,
        });
      }

      frameOffset += scene.duration * fps;
    }

    console.log(`[Step 4] Generated ${captions.length} caption segments`);
    return captions;
  }
}
