/**
 * Test the full audio pipeline (TTS + estimated timestamps)
 */
import { generateAudio } from '../../src/audio/pipeline';
import type { ScriptOutput } from '../../src/script/generator';

const mockScript: ScriptOutput = {
  schemaVersion: '1.1.0',
  topic: 'Test Topic',
  archetype: 'listicle',
  title: 'Test Video',
  scenes: [
    { id: 'scene-1', text: 'Hello and welcome to this test video.', visualDirection: 'Office setting' },
    { id: 'scene-2', text: 'This is the first point we want to cover.', visualDirection: 'Charts and graphs' },
    { id: 'scene-3', text: 'And here is the second important point.', visualDirection: 'Team collaboration' },
  ],
  hook: 'You will not believe what happens next!',
  cta: 'Like and subscribe for more!',
  wordCount: 40,
  estimatedDuration: 16,
  reasoning: 'Test script for audio pipeline',
};

async function testAudioPipeline() {
  console.log('Testing audio pipeline with kokoro TTS...\n');
  
  const result = await generateAudio({
    script: mockScript,
    voice: 'af_heart',
    outputPath: './test-output-audio.wav',
    timestampsPath: './test-output-timestamps.json',
  });
  
  console.log('\n=== Audio Pipeline Result ===');
  console.log(`Audio path: ${result.audioPath}`);
  console.log(`Duration: ${result.duration.toFixed(2)}s`);
  console.log(`Word count: ${result.wordCount}`);
  console.log(`Voice: ${result.voice}`);
  console.log(`Sample rate: ${result.sampleRate}`);
  console.log(`TTS cost: $${result.ttsCost}`);
  console.log(`\nTimestamps engine: ${result.timestamps.asrEngine}`);
  console.log(`Scene count: ${result.timestamps.scenes.length}`);
  
  for (const scene of result.timestamps.scenes) {
    console.log(`\n  Scene ${scene.sceneId}:`);
    console.log(`    Time: ${scene.audioStart.toFixed(2)}s - ${scene.audioEnd.toFixed(2)}s`);
    console.log(`    Words: ${scene.words.length}`);
    console.log(`    First 3 words: ${scene.words.slice(0, 3).map(w => `"${w.word}" (${w.start.toFixed(2)}s)`).join(', ')}`);
  }
  
  console.log('\n✅ Audio pipeline test complete!');
}

testAudioPipeline().catch(console.error);
