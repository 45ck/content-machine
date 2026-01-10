/**
 * Timestamp importer
 *
 * Generates word-level timestamps from an existing audio file.
 */
import { createLogger } from '../core/logger';
import { transcribeAudio } from '../audio/asr';
import { reconcileToScript } from '../audio/asr/reconcile';
import { buildAlignmentUnits, buildSceneTimestamps, normalizeSpokenText } from '../audio/alignment';
import {
  TimestampsOutputSchema,
  AUDIO_SCHEMA_VERSION,
  type TimestampsOutput,
  type WordTimestamp,
} from '../audio/schema';
import type { ScriptOutput } from '../script/schema';
import { probeAudioWithFfprobe } from '../validate/ffprobe-audio';

export interface GenerateTimestampsOptions {
  audioPath: string;
  script?: ScriptOutput;
  whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  requireWhisper?: boolean;
  reconcile?: boolean;
}

function buildScriptText(script: ScriptOutput): string {
  return buildAlignmentUnits(script)
    .map((unit) => normalizeSpokenText(unit.text))
    .join(' ');
}

function wordsToText(words: WordTimestamp[]): string {
  return words.map((word) => word.word).join(' ').trim();
}

export async function generateTimestamps(
  options: GenerateTimestampsOptions
): Promise<TimestampsOutput> {
  const log = createLogger({ module: 'timestamps', audioPath: options.audioPath });

  let audioDuration: number | undefined;
  try {
    const audioInfo = await probeAudioWithFfprobe(options.audioPath);
    audioDuration = audioInfo.durationSeconds;
  } catch (error) {
    log.warn({ error }, 'Failed to probe audio duration, relying on ASR only');
  }

  const scriptText = options.script ? buildScriptText(options.script) : undefined;

  const asrResult = await transcribeAudio({
    audioPath: options.audioPath,
    model: options.whisperModel,
    originalText: scriptText,
    audioDuration,
    requireWhisper: options.requireWhisper,
  });

  let finalWords = asrResult.words;
  if (options.reconcile && options.script && asrResult.engine !== 'estimated') {
    finalWords = reconcileToScript(asrResult.words, scriptText ?? '');
  }

  const units = options.script
    ? buildAlignmentUnits(options.script)
    : [
        {
          id: 'scene-001',
          text: asrResult.text || wordsToText(finalWords),
        },
      ];

  const scenes = buildSceneTimestamps(finalWords, units, asrResult.duration);

  const output = {
    schemaVersion: AUDIO_SCHEMA_VERSION,
    scenes,
    allWords: finalWords,
    totalDuration: asrResult.duration,
    ttsEngine: 'external',
    asrEngine: asrResult.engine,
  };

  return TimestampsOutputSchema.parse(output);
}
