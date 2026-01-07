/**
 * Install whisper.cpp and download model
 */
import { downloadWhisperModel } from '@remotion/install-whisper-cpp';

async function main() {
  console.log('Downloading base model...');
  await downloadWhisperModel({ model: 'base', folder: './.cache/whisper' });

  console.log('✅ Whisper model downloaded successfully!');
}

main().catch((error) => {
  console.error('Failed to install whisper:', error);
  process.exit(1);
});
