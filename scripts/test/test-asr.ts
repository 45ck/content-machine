/**
 * Test ASR (whisper.cpp) transcription
 */
import { downloadWhisperModel, transcribe, installWhisperCpp } from '@remotion/install-whisper-cpp';
import { existsSync, mkdirSync } from 'fs';

async function testASR() {
  const audioPath = 'test-audio.wav';
  const modelFolder = './.cache/whisper';
  const whisperFolder = './.cache/whisper-cpp';

  // Create cache folders if needed
  if (!existsSync(modelFolder)) {
    mkdirSync(modelFolder, { recursive: true });
  }
  if (!existsSync(whisperFolder)) {
    mkdirSync(whisperFolder, { recursive: true });
  }

  console.log('Installing whisper.cpp binary...');
  const { alreadyExisted } = await installWhisperCpp({
    to: whisperFolder,
    version: '1.5.5',
  });
  console.log('Whisper.cpp installed:', alreadyExisted ? 'already existed' : 'newly installed');

  console.log('Downloading whisper model (base)...');
  await downloadWhisperModel({
    model: 'base',
    folder: modelFolder,
  });

  console.log('Transcribing audio...');
  const result = await transcribe({
    inputPath: audioPath,
    model: 'base',
    modelFolder,
    whisperPath: `${whisperFolder}/whisper.cpp/main`,
    tokenLevelTimestamps: true,
  });

  console.log('\nTranscription result:');
  console.log('Segments:', result.transcription.length);

  for (const segment of result.transcription) {
    console.log(`  [${segment.offsets?.from}ms - ${segment.offsets?.to}ms] ${segment.text}`);
    if (segment.tokens) {
      console.log(`    Tokens: ${segment.tokens.length}`);
      for (const token of segment.tokens.slice(0, 5)) {
        console.log(
          `      "${token.text}" [${token.offsets.from}-${token.offsets.to}ms] conf: ${token.p?.toFixed(3)}`
        );
      }
      if (segment.tokens.length > 5) {
        console.log(`      ... and ${segment.tokens.length - 5} more`);
      }
    }
  }
}

testASR().catch(console.error);
