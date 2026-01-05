/**
 * Test Remotion render with fallback colors
 */
import { renderVideo } from '../../src/render/service';
import type { VisualsOutput } from '../../src/visuals/schema';
import type { TimestampsOutput, WordTimestamp } from '../../src/audio/schema';

// Create mock data for render test
const words: WordTimestamp[] = [
  { word: 'Hello', start: 0, end: 0.5, confidence: 0.95 },
  { word: 'world', start: 0.5, end: 1.0, confidence: 0.95 },
  { word: 'this', start: 1.0, end: 1.5, confidence: 0.95 },
  { word: 'is', start: 1.5, end: 2.0, confidence: 0.95 },
  { word: 'a', start: 2.0, end: 2.5, confidence: 0.95 },
  { word: 'test', start: 2.5, end: 3.0, confidence: 0.95 },
];

const mockTimestamps: TimestampsOutput = {
  schemaVersion: '1.1.0',
  scenes: [
    { sceneId: 'scene-1', audioStart: 0, audioEnd: 1.5, words: words.slice(0, 3) },
    { sceneId: 'scene-2', audioStart: 1.5, audioEnd: 3.0, words: words.slice(3, 6) },
  ],
  allWords: words,
  totalDuration: 3.0,
  ttsEngine: 'mock',
  asrEngine: 'mock',
};

const mockVisuals: VisualsOutput = {
  schemaVersion: '1.1.0',
  scenes: [
    {
      sceneId: 'scene-1',
      source: 'fallback-color',
      assetPath: '#3498db', // Blue
      duration: 1.5,
    },
    {
      sceneId: 'scene-2',
      source: 'fallback-color',
      assetPath: '#e74c3c', // Red
      duration: 1.5,
    },
  ],
  keywords: [
    { keyword: 'hello', sectionId: 'scene-1', startTime: 0, endTime: 1.5 },
    { keyword: 'test', sectionId: 'scene-2', startTime: 1.5, endTime: 3.0 },
  ],
  totalDuration: 3.0,
  fallbackCount: 2,
};

async function testRender() {
  console.log('Testing Remotion render with fallback colors...\n');
  
  // First test mock mode
  console.log('Testing mock render...');
  const mockResult = await renderVideo({
    visuals: mockVisuals,
    timestamps: mockTimestamps,
    audioPath: 'test-audio.wav', // Doesn't need to exist for mock
    outputPath: './test-render-mock.mp4',
    orientation: 'portrait',
    mock: true,
  });
  
  console.log('Mock render result:');
  console.log(`  Output: ${mockResult.outputPath}`);
  console.log(`  Duration: ${mockResult.duration}s`);
  console.log(`  Size: ${mockResult.fileSize} bytes`);
  console.log(`  Resolution: ${mockResult.width}x${mockResult.height}`);
  
  console.log('\n✅ Mock render complete!');
  
  // Now try real render (will fail without audio file)
  console.log('\nTesting real Remotion render...');
  try {
    const result = await renderVideo({
      visuals: mockVisuals,
      timestamps: mockTimestamps,
      audioPath: 'test-output-audio.wav', // Use previously generated audio
      outputPath: './test-render-real.mp4',
      orientation: 'portrait',
    });
    
    console.log('Real render result:');
    console.log(`  Output: ${result.outputPath}`);
    console.log(`  Duration: ${result.duration}s`);
    console.log(`  Size: ${result.fileSize} bytes`);
    console.log(`  Resolution: ${result.width}x${result.height}`);
    console.log('\n✅ Real render complete!');
  } catch (error) {
    console.log('Real render failed (expected if no audio file):');
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

testRender().catch(console.error);
