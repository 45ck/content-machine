import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const laneDir = path.resolve('experiments/proving-wave-1/text-thread-reveal');
const scriptPath = path.join(laneDir, 'script', 'manual-script.json');
const audioPath = path.join(laneDir, 'output', 'audio', 'audio.wav');
const outputPath = path.join(laneDir, 'output', 'audio', 'timestamps.json');

const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
const duration = Number(
  execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      audioPath,
    ],
    { encoding: 'utf8' }
  ).trim()
);

const pauseBetweenScenes = 0.18;
const scenes = script.scenes.map((scene) => ({
  id: scene.id,
  text: String(scene.text).trim(),
  words: String(scene.text)
    .trim()
    .split(/\s+/)
    .filter(Boolean),
}));

const totalWordCount = scenes.reduce((sum, scene) => sum + scene.words.length, 0);
const totalPause = pauseBetweenScenes * Math.max(0, scenes.length - 1);
const spokenDuration = Math.max(0.5, duration - totalPause);

let cursor = 0;
const allWords = [];
const sceneBlocks = scenes.map((scene) => {
  const sceneDuration = spokenDuration * (scene.words.length / totalWordCount);
  const wordSpan = scene.words.length > 0 ? sceneDuration / scene.words.length : sceneDuration;
  const audioStart = cursor;
  const words = scene.words.map((word, index) => {
    const start = cursor + index * wordSpan;
    const end = start + wordSpan;
    const cleanWord = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') || word;
    const stamped = {
      word: cleanWord,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      confidence: 1,
    };
    allWords.push(stamped);
    return stamped;
  });

  cursor += sceneDuration;
  const audioEnd = cursor;
  cursor += pauseBetweenScenes;

  return {
    sceneId: scene.id,
    audioStart: Number(audioStart.toFixed(3)),
    audioEnd: Number(audioEnd.toFixed(3)),
    words,
  };
});

const timestamps = {
  schemaVersion: '1.0.0',
  scenes: sceneBlocks,
  allWords,
  totalDuration: Number(duration.toFixed(3)),
  ttsEngine: 'ffmpeg-flite',
  asrEngine: 'manual-alignment',
  analysis: {
    reconciled: false,
  },
  wordCount: allWords.length,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(timestamps, null, 2));
console.log(outputPath);
