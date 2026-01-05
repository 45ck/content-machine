/**
 * End-to-End Pipeline Test
 *
 * Tests the full content-machine pipeline:
 * 1. Generate script (mock LLM)
 * 2. Generate TTS audio (real kokoro-js)
 * 3. Generate timestamps (estimated)
 * 4. Match visuals (real Pexels API - using visualDirection directly)
 * 5. Render video (real Remotion)
 */
import 'dotenv/config';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { generateAudio, type GenerateAudioOptions } from '../../src/audio/pipeline';
import { searchPexels } from '../../src/visuals/providers/pexels';
import { renderVideo, type RenderVideoOptions } from '../../src/render/service';
import type { ScriptOutput, Scene } from '../../src/script/schema';
import type { TimestampsOutput, SceneTimestamp } from '../../src/audio/schema';
import type { VisualsOutput, VisualAsset, Keyword } from '../../src/visuals/schema';

const OUTPUT_DIR = './test-e2e-output';

// Mock script for testing (normally would come from cm script)
const mockScript: ScriptOutput = {
  schemaVersion: '1.0.0',
  title: '5 JavaScript Tips',
  reasoning: 'Mock script for E2E testing',
  scenes: [
    {
      id: 'hook',
      text: 'Want to become a better JavaScript developer? Here are five tips you need to know.',
      visualDirection: 'person coding on laptop',
      mood: 'excited',
      duration: 5,
    },
    {
      id: 'tip-1',
      text: 'Tip one: Use const and let instead of var. It prevents scope issues and makes your code cleaner.',
      visualDirection: 'code editor with javascript',
      mood: 'informative',
      duration: 6,
    },
    {
      id: 'tip-2',
      text: 'Tip two: Learn array methods like map, filter, and reduce. They make data manipulation easy.',
      visualDirection: 'data visualization',
      mood: 'educational',
      duration: 6,
    },
    {
      id: 'cta',
      text: 'Follow for more coding tips!',
      visualDirection: 'thumbs up gesture',
      mood: 'friendly',
      duration: 3,
    },
  ],
  meta: {
    topic: '5 JavaScript Tips',
    archetype: 'listicle',
    generatedAt: new Date().toISOString(),
  },
};

async function main() {
  console.log('🚀 Starting End-to-End Pipeline Test\n');
  console.log('=' .repeat(50));

  // Create output directory
  await mkdir(OUTPUT_DIR, { recursive: true });

  try {
    // Step 1: Generate Audio with TTS
    console.log('\n📢 Step 1: Generating audio with kokoro TTS...');
    const audioOutputPath = join(OUTPUT_DIR, 'audio.wav');
    const timestampsOutputPath = join(OUTPUT_DIR, 'timestamps.json');

    const fullText = mockScript.scenes.map((s) => s.text).join(' ');
    console.log(`   Text length: ${fullText.length} characters`);
    console.log(`   Scenes: ${mockScript.scenes.length}`);

    const audioResult = await generateAudio({
      script: mockScript,
      outputPath: audioOutputPath,
      timestampsPath: timestampsOutputPath,
      voice: 'af_heart',
    });

    console.log(`   ✅ Audio generated: ${audioResult.audioPath}`);
    console.log(`   Duration: ${audioResult.duration.toFixed(2)}s`);
    console.log(`   Words: ${audioResult.timestamps.allWords.length}`);

    // Step 2: Match Visuals with Pexels (using visualDirection directly, no LLM)
    console.log('\n🎬 Step 2: Matching visuals with Pexels API...');

    const visualsResult = await matchVisualsDirectly(
      audioResult.timestamps,
      mockScript.scenes,
      'portrait'
    );

    console.log(`   ✅ Visuals matched: ${visualsResult.scenes.length} scenes`);
    for (const scene of visualsResult.scenes) {
      console.log(`      - ${scene.sceneId}: ${scene.source} (${scene.duration.toFixed(1)}s)`);
    }

    // Step 3: Render Video with Remotion
    console.log('\n🎥 Step 3: Rendering video with Remotion...');
    console.log('   (This may take 2-5 minutes for bundling...)');

    const videoOutput = join(OUTPUT_DIR, 'final-video.mp4');

    const renderResult = await renderVideo({
      visuals: visualsResult,
      timestamps: audioResult.timestamps,
      audioPath: audioResult.audioPath,
      outputPath: videoOutput,
      orientation: 'portrait',
      archetype: 'listicle',
    } as RenderVideoOptions);

    console.log(`   ✅ Video rendered: ${renderResult.outputPath}`);
    console.log(`   Duration: ${renderResult.duration.toFixed(2)}s`);
    console.log(`   Resolution: ${renderResult.width}x${renderResult.height}`);
    console.log(`   File size: ${(renderResult.fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('✅ END-TO-END PIPELINE COMPLETE!');
    console.log('=' .repeat(50));
    console.log(`\nOutput files in ${OUTPUT_DIR}:`);
    console.log(`  - audio.wav (TTS audio)`);
    console.log(`  - final-video.mp4 (rendered video)`);
    console.log('\nPlay the video to verify the result!');
  } catch (error) {
    console.error('\n❌ Pipeline failed:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Match visuals directly using visualDirection from script scenes.
 * This bypasses the LLM keyword extraction for testing purposes.
 */
async function matchVisualsDirectly(
  timestamps: TimestampsOutput,
  scriptScenes: Scene[],
  orientation: 'portrait' | 'landscape' | 'square'
): Promise<VisualsOutput> {
  const visualAssets: VisualAsset[] = [];
  const keywords: Keyword[] = [];
  let fallbacks = 0;

  for (const scene of timestamps.scenes ?? []) {
    // Find matching script scene to get visualDirection
    const scriptScene = scriptScenes.find((s) => s.id === scene.sceneId);
    const searchQuery = scriptScene?.visualDirection ?? 'abstract motion background';
    // Ensure minimum duration of 1 second
    const duration = Math.max(1, scene.audioEnd - scene.audioStart);

    console.log(`   Searching Pexels for: "${searchQuery}" (duration: ${duration.toFixed(2)}s)`);

    keywords.push({
      keyword: searchQuery,
      sectionId: scene.sceneId,
      startTime: scene.audioStart,
      endTime: scene.audioEnd,
    });

    try {
      const videos = await searchPexels({
        query: searchQuery,
        orientation,
        perPage: 3,
      });

      if (videos.length > 0) {
        const video = videos[0];
        visualAssets.push({
          sceneId: scene.sceneId,
          source: 'stock-pexels',
          assetPath: video.url,
          duration,
          matchReasoning: {
            reasoning: `Found video matching "${searchQuery}"`,
            conceptsMatched: searchQuery.split(' '),
          },
        });
      } else {
        throw new Error('No videos found');
      }
    } catch (error) {
      console.log(`   ⚠️ Fallback for ${scene.sceneId}: ${error}`);
      visualAssets.push({
        sceneId: scene.sceneId,
        source: 'fallback-color',
        assetPath: '#1a1a2e',
        duration,
        matchReasoning: {
          reasoning: `No video found for "${searchQuery}", using solid color`,
        },
      });
      fallbacks++;
    }
  }

  return {
    schemaVersion: '1.1.0',
    scenes: visualAssets,
    totalAssets: visualAssets.length,
    fromUserFootage: 0,
    fromStock: visualAssets.length - fallbacks,
    