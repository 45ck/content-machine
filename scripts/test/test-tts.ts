/**
 * Test TTS generation with kokoro-js
 */
import { KokoroTTS } from 'kokoro-js';

async function testTTS() {
  console.log('Loading TTS model...');
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
    dtype: 'q8',
  });

  console.log('Generating audio...');
  const audio = await tts.generate(
    'Hello, this is a test of the text to speech system. Welcome to content machine!',
    { voice: 'af_heart' }
  );

  await audio.save('test-audio.wav');
  const duration = audio.audio.length / audio.sampling_rate;
  console.log(`Audio saved! Duration: ${duration.toFixed(2)} seconds`);
}

testTTS().catch(console.error);
