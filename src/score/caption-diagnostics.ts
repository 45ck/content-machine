/**
 * Caption Diagnostics
 *
 * Reports chunk pacing metrics to identify fast/short caption events.
 */
import type { WordTimestamp } from '../domain';
import type { CaptionConfig } from '../render/captions/config';
import {
  createCaptionChunks,
  layoutToChunkingConfig,
  resolveChunkingConfig,
  getRequiredMinDurationMs,
} from '../render/captions/chunking';
import { filterCaptionWords } from '../render/captions/paging';

export interface CaptionChunkDiagnostic {
  index: number;
  text: string;
  wordCount: number;
  charCount: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  requiredMinMs: number;
  cps: number;
  wpm: number;
  meetsMinDuration: boolean;
}

export interface CaptionDiagnosticsReport {
  totalChunks: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  maxCps: number;
  maxWpm: number;
  fastChunkCount: number;
  chunks: CaptionChunkDiagnostic[];
}

function toChunkWords(
  words: WordTimestamp[],
  cleanup: CaptionConfig['cleanup']
): Array<{ word: string; startMs: number; endMs: number }> {
  return filterCaptionWords(words, cleanup).map((word) => ({
    word: word.word,
    startMs: word.start * 1000,
    endMs: word.end * 1000,
  }));
}

export function analyzeCaptionChunks(
  words: WordTimestamp[],
  captionConfig: CaptionConfig
): CaptionDiagnosticsReport {
  const layoutOverride = {
    ...captionConfig.layout,
    maxWordsPerPage: captionConfig.wordsPerPage ?? captionConfig.layout.maxWordsPerPage,
  };
  const chunkingConfig = resolveChunkingConfig(layoutToChunkingConfig(layoutOverride));
  const chunkWords = toChunkWords(words, captionConfig.cleanup);
  const chunks = createCaptionChunks(chunkWords, chunkingConfig);

  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      avgDurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      maxCps: 0,
      maxWpm: 0,
      fastChunkCount: 0,
      chunks: [],
    };
  }

  const diagnostics = chunks.map((chunk) => {
    const durationMs = Math.max(1, chunk.endMs - chunk.startMs);
    const requiredMinMs = getRequiredMinDurationMs(
      chunk.words.length,
      chunk.charCount,
      chunkingConfig
    );
    const cps = chunk.charCount / (durationMs / 1000);
    const wpm = chunk.words.length / (durationMs / 60000);

    return {
      index: chunk.index,
      text: chunk.text,
      wordCount: chunk.words.length,
      charCount: chunk.charCount,
      startMs: chunk.startMs,
      endMs: chunk.endMs,
      durationMs,
      requiredMinMs,
      cps,
      wpm,
      meetsMinDuration: durationMs >= requiredMinMs,
    };
  });

  const durations = diagnostics.map((d) => d.durationMs);
  const avgDurationMs = durations.reduce((sum, value) => sum + value, 0) / durations.length;

  return {
    totalChunks: diagnostics.length,
    avgDurationMs,
    minDurationMs: Math.min(...durations),
    maxDurationMs: Math.max(...durations),
    maxCps: Math.max(...diagnostics.map((d) => d.cps)),
    maxWpm: Math.max(...diagnostics.map((d) => d.wpm)),
    fastChunkCount: diagnostics.filter((d) => !d.meetsMinDuration).length,
    chunks: diagnostics,
  };
}
