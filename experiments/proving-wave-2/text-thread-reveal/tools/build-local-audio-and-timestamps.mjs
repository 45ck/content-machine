import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const laneDir = path.resolve('experiments/proving-wave-2/text-thread-reveal');
const scriptPath = path.join(laneDir, 'script', 'manual-script.json');
const outputDir = path.join(laneDir, 'output', 'audio');
const scenesDir = path.join(outputDir, 'scene-wavs');
const concatListPath = path.join(outputDir, 'concat.txt');
const audioPath = path.join(outputDir, 'audio.wav');
const outputMetadataPath = path.join(outputDir, 'audio.json');
const timestampsPath = path.join(outputDir, 'timestamps.json');

const voice = 'slt';
const sampleRate = 24000;

const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
fs.mkdirSync(scenesDir, { recursive: true });

function probeDuration(filePath) {
  return Number(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath
      ],
      { encoding: 'utf8' }
    ).trim()
  );
}

const durations = [];

for (const [index, scene] of script.scenes.entries()) {
  const sceneTextPath = path.join(scenesDir, `${String(index + 1).padStart(2, '0')}.txt`);
  const sceneAudioPath = path.join(scenesDir, `${String(index + 1).padStart(2, '0')}.wav`);
  fs.writeFileSync(sceneTextPath, `${scene.text}\n`, 'utf8');
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `flite=textfile=${sceneTextPath}:voice=${voice}`,
      '-ar',
      String(sampleRate),
      '-ac',
      '1',
      sceneAudioPath
    ],
    { stdio: 'ignore' }
  );
  durations.push({
    sceneId: scene.id,
    sceneAudioPath,
    duration: probeDuration(sceneAudioPath)
  });
}

fs.writeFileSync(
  concatListPath,
  durations.map((item) => `file '${item.sceneAudioPath.replaceAll("'", "'\\''")}'`).join('\n') + '\n',
  'utf8'
);

execFileSync(
  'ffmpeg',
  ['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', audioPath],
  { stdio: 'ignore' }
);

const allWords = [];
let cursor = 0;
const sceneBlocks = script.scenes.map((scene, index) => {
  const duration = durations[index].duration;
  const words = String(scene.text)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const span = words.length > 0 ? duration / words.length : duration;
  const timedWords = words.map((word, wordIndex) => {
    const start = cursor + wordIndex * span;
    const end = wordIndex === words.length - 1 ? cursor + duration : start + span;
    const cleanWord = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') || word;
    const stamped = {
      word: cleanWord,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      confidence: 0.85
    };
    allWords.push(stamped);
    return stamped;
  });

  const audioStart = cursor;
  const audioEnd = cursor + duration;
  cursor = audioEnd;

  return {
    sceneId: scene.id,
    audioStart: Number(audioStart.toFixed(3)),
    audioEnd: Number(audioEnd.toFixed(3)),
    words: timedWords
  };
});

const totalDuration = Number(probeDuration(audioPath).toFixed(3));

const timestamps = {
  schemaVersion: '1.0.0',
  scenes: sceneBlocks,
  allWords,
  totalDuration,
  ttsEngine: 'ffmpeg-flite-per-scene',
  asrEngine: 'measured-scene-estimation',
  analysis: {
    reconciled: false
  },
  wordCount: allWords.length
};

const audioMetadata = {
  schemaVersion: '1.0.0',
  audioPath,
  timestampsPath,
  duration: totalDuration,
  wordCount: allWords.length,
  voice,
  sampleRate,
  ttsCost: 0,
  timestamps
};

fs.writeFileSync(timestampsPath, JSON.stringify(timestamps, null, 2));
fs.writeFileSync(outputMetadataPath, JSON.stringify(audioMetadata, null, 2));

console.log(audioPath);
console.log(timestampsPath);
