import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  buildAlignmentUnits,
  buildSceneTimestamps,
  type WordTimestamp,
} from '../../../../src/audio/pipeline.ts';
import { normalizeSpokenText } from '../../../../src/audio/alignment.ts';
import { transcribeAudio } from '../../../../src/audio/asr/index.ts';
import type { ScriptOutput } from '../../../../src/domain/index.ts';

const laneRoot = resolve('experiments/proving-wave-2/gameplay-confession-split');
const scriptPath = resolve(laneRoot, 'script.json');
const narrationPath = resolve(laneRoot, 'narration.txt');
const outputDir = resolve(laneRoot, 'output/work/audio');
const audioPath = resolve(outputDir, 'audio.wav');
const timestampsPath = resolve(outputDir, 'timestamps.json');
const metadataPath = resolve(outputDir, 'audio.json');

const script = JSON.parse(readFileSync(scriptPath, 'utf8')) as ScriptOutput;
const units = buildAlignmentUnits(script);
const narration = units.map((unit) => normalizeSpokenText(unit.text)).join(' ');

function buildEstimatedWords(totalDuration: number): WordTimestamp[] {
  const safeDuration = Math.max(totalDuration, 0.001);
  const normalizedUnits = units.map((unit) => ({
    ...unit,
    words: normalizeSpokenText(unit.text).split(/\s+/).filter(Boolean),
  }));
  const totalChars =
    normalizedUnits.reduce(
      (sum, unit) => sum + unit.words.reduce((wordSum, word) => wordSum + word.length, 0),
      0
    ) || 1;
  const words: WordTimestamp[] = [];
  let cursor = 0;

  for (const unit of normalizedUnits) {
    for (const word of unit.words) {
      const duration = (word.length / totalChars) * safeDuration;
      const start = Number(cursor.toFixed(3));
      cursor += duration;
      const end = Number(cursor.toFixed(3));
      words.push({ word, start, end, confidence: 0.8 });
    }
  }

  if (words.length > 0) {
    words[words.length - 1].end = Number(safeDuration.toFixed(3));
  }
  return words;
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(narrationPath, narration + '\n', 'utf8');

execFileSync(
  'ffmpeg',
  [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `flite=textfile='${narrationPath.replace(/'/g, "'\\''")}':voice=slt`,
    '-ar',
    '24000',
    '-ac',
    '1',
    '-c:a',
    'pcm_s16le',
    audioPath,
  ],
  { stdio: 'inherit' }
);

const ffprobeOutput = execFileSync(
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
);
const duration = Number(ffprobeOutput.trim());

let asrEngine: string = 'estimated';
let asrWords;

try {
  process.env.CM_WHISPER_AUTO_INSTALL = process.env.CM_WHISPER_AUTO_INSTALL ?? '1';
  const asr = await Promise.race([
    transcribeAudio({
      engine: 'whisper',
      audioPath,
      model: 'tiny',
      originalText: narration,
      audioDuration: duration,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Whisper alignment timed out after 45s')), 45_000);
    }),
  ]);
  asrEngine = asr.engine;
  asrWords = asr.words;
} catch (error) {
  asrEngine = 'estimated';
  asrWords = buildEstimatedWords(duration);
  writeFileSync(
    resolve(outputDir, 'alignment-warning.txt'),
    `Whisper alignment failed; fallback engine used: ${String(error)}\n`,
    'utf8'
  );
}

const scenes = buildSceneTimestamps(asrWords, units, duration);
const timestamps = {
  schemaVersion: '1.0.0',
  scenes,
  allWords: asrWords,
  totalDuration: duration,
  ttsEngine: 'flite',
  asrEngine,
  analysis: {
    reconciled: false
  }
};

const metadata = {
  schemaVersion: '1.0.0',
  audioPath,
  timestampsPath,
  timestamps,
  duration,
  wordCount: asrWords.length,
  voice: 'flite-slt',
  sampleRate: 24000
};

writeFileSync(timestampsPath, JSON.stringify(timestamps, null, 2) + '\n', 'utf8');
writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n', 'utf8');
console.log(
  JSON.stringify(
    {
      audioPath,
      timestampsPath,
      metadataPath,
      duration,
      wordCount: asrWords.length,
      asrEngine,
    },
    null,
    2
  )
);
