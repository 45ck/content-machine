import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(root, 'local-script.json');
const outputDir = join(root, 'output', 'local-only-001', 'audio');
const narrationPath = join(outputDir, 'narration.txt');
const audioPath = join(outputDir, 'audio.wav');
const timestampsPath = join(outputDir, 'timestamps.json');
const audioMetadataPath = join(outputDir, 'audio.json');

function tokenize(text) {
  return text.match(/[A-Za-z0-9'-]+/g) ?? [];
}

function round(value) {
  return Number(value.toFixed(3));
}

const script = JSON.parse(await readFile(scriptPath, 'utf8'));
const scenes = script.scenes ?? [];

if (!Array.isArray(scenes) || scenes.length === 0) {
  throw new Error(`No scenes found in ${scriptPath}`);
}

await mkdir(outputDir, { recursive: true });

const narration = scenes.map((scene) => scene.text.trim()).join(' ');
await writeFile(narrationPath, narration, 'utf8');

await execFileAsync('ffmpeg', [
  '-y',
  '-f',
  'lavfi',
  '-i',
  `flite=textfile=${narrationPath}:voice=slt`,
  '-ar',
  '24000',
  '-ac',
  '1',
  audioPath,
]);

const { stdout: probeStdout } = await execFileAsync('ffprobe', [
  '-v',
  'error',
  '-show_entries',
  'format=duration',
  '-of',
  'default=noprint_wrappers=1:nokey=1',
  audioPath,
]);

const totalDuration = Number(probeStdout.trim());
if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
  throw new Error(`Invalid probed duration for ${audioPath}: ${probeStdout}`);
}

const weightSum = scenes.reduce(
  (sum, scene) => sum + (typeof scene.duration === 'number' && scene.duration > 0 ? scene.duration : 1),
  0
);

let cursor = 0;
const sceneTimestamps = [];
const allWords = [];

for (const [index, scene] of scenes.entries()) {
  const words = tokenize(scene.text);
  const sceneWeight =
    typeof scene.duration === 'number' && scene.duration > 0 ? scene.duration : words.length || 1;
  const remainingDuration = totalDuration - cursor;
  const isLast = index === scenes.length - 1;
  const sceneDuration = isLast ? remainingDuration : (totalDuration * sceneWeight) / weightSum;
  const audioStart = round(cursor);
  const audioEnd = round(isLast ? totalDuration : cursor + sceneDuration);
  const safeDuration = Math.max(audioEnd - audioStart, 0.001);
  const step = safeDuration / Math.max(words.length, 1);
  const sceneWords = words.map((word, wordIndex) => {
    const start = round(audioStart + step * wordIndex);
    const end = round(wordIndex === words.length - 1 ? audioEnd : audioStart + step * (wordIndex + 1));
    return { word, start, end, confidence: 1 };
  });

  sceneTimestamps.push({
    sceneId: scene.id,
    audioStart,
    audioEnd,
    words: sceneWords,
  });
  allWords.push(...sceneWords);
  cursor = audioEnd;
}

if (allWords.length > 0) {
  allWords[allWords.length - 1].end = round(totalDuration);
}

const timestamps = {
  schemaVersion: '1.0.0',
  scenes: sceneTimestamps,
  allWords,
  totalDuration: round(totalDuration),
  ttsEngine: 'ffmpeg-flite',
  asrEngine: 'manual-timing',
  wordCount: allWords.length,
};

const audioMetadata = {
  schemaVersion: '1.0.0',
  audioPath,
  timestampsPath,
  timestamps,
  duration: round(totalDuration),
  wordCount: allWords.length,
  voice: 'slt',
  sampleRate: 24000,
};

await writeFile(timestampsPath, `${JSON.stringify(timestamps, null, 2)}\n`, 'utf8');
await writeFile(audioMetadataPath, `${JSON.stringify(audioMetadata, null, 2)}\n`, 'utf8');

console.log(
  JSON.stringify(
    {
      ok: true,
      audioPath,
      timestampsPath,
      audioMetadataPath,
      duration: round(totalDuration),
      wordCount: allWords.length,
    },
    null,
    2
  )
);
