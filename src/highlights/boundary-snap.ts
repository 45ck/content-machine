import {
  BOUNDARY_SNAP_SCHEMA_VERSION,
  BoundarySnapOutputSchema,
  HighlightSelectionOutputSchema,
  TimestampsOutputSchema,
  type BoundarySnapOutput,
  type HighlightCandidate,
  type TimestampsOutput,
  type WordTimestamp,
} from '../domain';

export interface SnapHighlightBoundariesOptions {
  sourceCandidatesPath: string;
  sourceTimestampsPath: string;
  maxLeadSeconds?: number;
  maxTailSeconds?: number;
  minDuration?: number;
  maxDuration?: number;
  snappedAt?: string;
}

function endsSentence(word: string): boolean {
  return /[.!?]["')\]]?$/.test(word.trim());
}

function gap(left: WordTimestamp | undefined, right: WordTimestamp | undefined): number {
  if (!left || !right) return 0;
  return Math.max(0, right.start - left.end);
}

function findSnapStart(
  words: WordTimestamp[],
  candidate: HighlightCandidate,
  maxLeadSeconds: number
): number {
  const originalStart = candidate.wordStartIndex;
  const originalWord = words[originalStart];
  if (!originalWord) return originalStart;

  for (let index = originalStart; index >= 0; index -= 1) {
    const current = words[index];
    if (!current) break;
    if (originalWord.start - current.start > maxLeadSeconds) break;
    if (index === 0) return index;

    const previous = words[index - 1];
    if (endsSentence(previous?.word ?? '') || gap(previous, current) >= 0.45) {
      return index;
    }
  }

  return originalStart;
}

function findSnapEnd(
  words: WordTimestamp[],
  candidate: HighlightCandidate,
  maxTailSeconds: number
): number {
  const originalEnd = candidate.wordEndIndex;
  const originalWord = words[originalEnd];
  if (!originalWord) return originalEnd;

  for (let index = originalEnd; index < words.length; index += 1) {
    const current = words[index];
    if (!current) break;
    if (current.end - originalWord.end > maxTailSeconds) break;
    if (endsSentence(current.word)) return index;

    const next = words[index + 1];
    if (gap(current, next) >= 0.45) return index;
  }

  return originalEnd;
}

function clampEndToDuration(params: {
  words: WordTimestamp[];
  startIndex: number;
  endIndex: number;
  minDuration: number;
  maxDuration: number;
}): { endIndex: number; clamped: boolean } {
  const start = params.words[params.startIndex];
  if (!start) return { endIndex: params.endIndex, clamped: false };

  let endIndex = params.endIndex;
  let clamped = false;
  while (endIndex > params.startIndex) {
    const end = params.words[endIndex];
    if (!end) break;
    const duration = end.end - start.start;
    if (duration <= params.maxDuration) break;
    endIndex -= 1;
    clamped = true;
  }

  while (endIndex < params.words.length - 1) {
    const end = params.words[endIndex];
    if (!end) break;
    const duration = end.end - start.start;
    if (duration >= params.minDuration) break;
    endIndex += 1;
    clamped = true;
  }

  return { endIndex, clamped };
}

export function snapHighlightBoundaries(
  timestampsInput: TimestampsOutput,
  selectionInput: unknown,
  options: SnapHighlightBoundariesOptions
): BoundarySnapOutput {
  const timestamps = TimestampsOutputSchema.parse(timestampsInput);
  const selection = HighlightSelectionOutputSchema.parse(selectionInput);
  const words = timestamps.allWords;
  const maxLeadSeconds = options.maxLeadSeconds ?? 0.9;
  const maxTailSeconds = options.maxTailSeconds ?? 1.1;
  const minDuration = options.minDuration ?? selection.params.minDuration;
  const maxDuration = options.maxDuration ?? selection.params.maxDuration;
  const warnings: string[] = [];

  const candidates = selection.candidates.map((candidate) => {
    const startIndex = findSnapStart(words, candidate, maxLeadSeconds);
    const endCandidate = findSnapEnd(words, candidate, maxTailSeconds);
    const clamped = clampEndToDuration({
      words,
      startIndex,
      endIndex: endCandidate,
      minDuration,
      maxDuration,
    });
    const start = words[startIndex];
    const end = words[clamped.endIndex];
    const reasons: Array<
      'sentence-boundary' | 'silence-boundary' | 'duration-clamp' | 'source-boundary'
    > = [];

    if (startIndex !== candidate.wordStartIndex || clamped.endIndex !== candidate.wordEndIndex) {
      reasons.push('sentence-boundary');
    }
    if (
      gap(words[startIndex - 1], start) >= 0.45 ||
      gap(end, words[clamped.endIndex + 1]) >= 0.45
    ) {
      reasons.push('silence-boundary');
    }
    if (clamped.clamped) reasons.push('duration-clamp');
    if (startIndex === 0 || clamped.endIndex === words.length - 1) reasons.push('source-boundary');

    if (!start || !end) {
      warnings.push(`Candidate ${candidate.id} references unavailable word timestamps`);
    }

    return {
      id: candidate.id,
      originalStart: candidate.start,
      originalEnd: candidate.end,
      snappedStart: start?.start ?? candidate.start,
      snappedEnd: end?.end ?? candidate.end,
      duration: Math.max(0.001, (end?.end ?? candidate.end) - (start?.start ?? candidate.start)),
      wordStartIndex: startIndex,
      wordEndIndex: clamped.endIndex,
      reasons: reasons.length > 0 ? reasons : ['sentence-boundary'],
    };
  });

  return BoundarySnapOutputSchema.parse({
    schemaVersion: BOUNDARY_SNAP_SCHEMA_VERSION,
    sourceCandidatesPath: options.sourceCandidatesPath,
    sourceTimestampsPath: options.sourceTimestampsPath,
    snappedAt: options.snappedAt ?? new Date().toISOString(),
    candidates,
    warnings,
  });
}
