import {
  HIGHLIGHT_SELECTION_SCHEMA_VERSION,
  HighlightSelectionOutputSchema,
  type HighlightCandidate,
  type HighlightCandidateScores,
  type HighlightCandidateSignals,
  type HighlightCandidateSourceSignals,
  type HighlightSelectionOutput,
  type HighlightSelectionParams,
  type SourceMediaAnalysisOutput,
  TimestampsOutputSchema,
  type TimestampsOutput,
  type WordTimestamp,
} from '../domain';

const DEFAULT_PARAMS: HighlightSelectionParams = {
  minDuration: 20,
  targetDuration: 35,
  maxDuration: 60,
  maxCandidates: 5,
  minWords: 8,
  minGapSeconds: 3,
};

const FILLER_WORDS = new Set([
  'um',
  'uh',
  'erm',
  'ah',
  'like',
  'basically',
  'literally',
  'actually',
  'just',
  'kinda',
  'kind',
  'sorta',
  'sort',
]);

const HOOK_CUES = new Set([
  'why',
  'how',
  'what',
  'when',
  'stop',
  'never',
  'nobody',
  'most',
  'biggest',
  'mistake',
  'secret',
  'truth',
]);

const PAYOFF_CUES = new Set([
  'because',
  'means',
  'therefore',
  'so',
  'that',
  'why',
  'fix',
  'result',
  'instead',
  'now',
]);

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeToken(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^a-z0-9]+/i, '')
    .replace(/[^a-z0-9]+$/i, '');
}

function endsSentence(word: string): boolean {
  return /[.!?]["')\]]?$/.test(word.trim());
}

function startsSentence(words: WordTimestamp[], index: number): boolean {
  if (index === 0) return true;
  const previous = words[index - 1];
  return previous ? endsSentence(previous.word) : true;
}

function wordGapSeconds(left: WordTimestamp | undefined, right: WordTimestamp | undefined): number {
  if (!left || !right) return 0;
  return Math.max(0, right.start - left.end);
}

function joinWords(words: WordTimestamp[]): string {
  return words
    .map((word) => word.word)
    .join(' ')
    .replace(/\s+([,.!?;:])/g, '$1');
}

function getMaxInternalGap(words: WordTimestamp[]): number {
  let maxGap = 0;
  for (let index = 1; index < words.length; index += 1) {
    maxGap = Math.max(maxGap, wordGapSeconds(words[index - 1], words[index]));
  }
  return maxGap;
}

function hasCue(words: WordTimestamp[], cues: Set<string>): boolean {
  return words.some((word) => cues.has(normalizeToken(word.word)));
}

function getFillerWordCount(words: WordTimestamp[]): number {
  return words.filter((word) => FILLER_WORDS.has(normalizeToken(word.word))).length;
}

function scoreDuration(duration: number, targetDuration: number, maxDuration: number): number {
  const distance = Math.abs(duration - targetDuration);
  const tolerance = Math.max(1, maxDuration - targetDuration);
  return clamp01(1 - distance / tolerance);
}

function calculateSignals(params: {
  allWords: WordTimestamp[];
  spanWords: WordTimestamp[];
  startIndex: number;
  endIndex: number;
}): HighlightCandidateSignals {
  const firstWords = params.spanWords.slice(0, 8);
  const lastWords = params.spanWords.slice(-10);

  return {
    wordCount: params.spanWords.length,
    leadingGapSeconds:
      params.startIndex === 0
        ? 0
        : wordGapSeconds(
            params.allWords[params.startIndex - 1],
            params.allWords[params.startIndex]
          ),
    trailingGapSeconds:
      params.endIndex >= params.allWords.length - 1
        ? 0
        : wordGapSeconds(params.allWords[params.endIndex], params.allWords[params.endIndex + 1]),
    maxInternalGapSeconds: getMaxInternalGap(params.spanWords),
    fillerWordCount: getFillerWordCount(params.spanWords),
    startsAtSentenceBoundary: startsSentence(params.allWords, params.startIndex),
    endsAtSentenceBoundary: endsSentence(params.spanWords[params.spanWords.length - 1]?.word ?? ''),
    startsWithHookCue: hasCue(firstWords, HOOK_CUES),
    endsWithPayoffCue: hasCue(lastWords, PAYOFF_CUES),
  };
}

function overlapSeconds(
  left: { start: number; end: number },
  right: { start: number; end: number }
): number {
  return Math.max(0, Math.min(left.end, right.end) - Math.max(left.start, right.start));
}

function sumMeasuredSilence(params: {
  sourceAnalysis?: SourceMediaAnalysisOutput | null;
  start: number;
  end: number;
}): number {
  const gaps = params.sourceAnalysis?.sourceSignals.silenceGaps ?? [];
  return Number(
    gaps
      .reduce((sum, gap) => sum + overlapSeconds({ start: params.start, end: params.end }, gap), 0)
      .toFixed(3)
  );
}

function sceneChangeScoreForSpan(params: {
  sourceAnalysis?: SourceMediaAnalysisOutput | null;
  start: number;
  end: number;
}): number | null {
  const changes = params.sourceAnalysis?.sourceSignals.sceneChanges;
  if (!changes) return params.sourceAnalysis?.sourceSignals.sceneChangeScore ?? null;
  const duration = Math.max(0, params.end - params.start);
  if (duration <= 0) return null;
  const count = changes.filter((time) => time >= params.start && time <= params.end).length;
  return clamp01(count / Math.max(1, duration / 3));
}

function calculateSourceSignals(
  signals: HighlightCandidateSignals,
  params: {
    start: number;
    end: number;
    sourceAnalysis?: SourceMediaAnalysisOutput | null;
  }
): HighlightCandidateSourceSignals {
  const fillerOnlySegmentCount =
    signals.fillerWordCount >= Math.max(3, signals.wordCount * 0.5) ? 1 : 0;
  const measuredSilence = sumMeasuredSilence({
    sourceAnalysis: params.sourceAnalysis,
    start: params.start,
    end: params.end,
  });

  return {
    silenceBeforeSeconds: signals.leadingGapSeconds,
    silenceAfterSeconds: signals.trailingGapSeconds,
    internalSilenceSeconds: Math.max(signals.maxInternalGapSeconds, measuredSilence),
    fillerOnlySegmentCount,
    audioEnergyScore: params.sourceAnalysis?.sourceSignals.audioEnergyScore ?? null,
    sceneChangeScore: sceneChangeScoreForSpan({
      sourceAnalysis: params.sourceAnalysis,
      start: params.start,
      end: params.end,
    }),
    llmNarrativeScore: null,
  };
}

function calculateScores(params: {
  duration: number;
  config: HighlightSelectionParams;
  signals: HighlightCandidateSignals;
}): HighlightCandidateScores {
  const fillerRatio =
    params.signals.wordCount > 0 ? params.signals.fillerWordCount / params.signals.wordCount : 1;
  const fillerRisk = clamp01(fillerRatio * 4);
  const silenceRisk = clamp01(Math.max(0, params.signals.maxInternalGapSeconds - 0.65) / 1.5);
  const hook =
    (params.signals.startsWithHookCue ? 0.68 : 0.08) +
    (params.signals.startsAtSentenceBoundary ? 0.2 : 0) +
    (params.signals.fillerWordCount === 0 ? 0.18 : 0);
  const boundary =
    (params.signals.startsAtSentenceBoundary ? 0.36 : 0) +
    (params.signals.endsAtSentenceBoundary ? 0.36 : 0) +
    (params.signals.leadingGapSeconds >= 0.35 || params.signals.wordCount <= params.config?.minWords
      ? 0.14
      : 0) +
    (params.signals.trailingGapSeconds >= 0.35 ? 0.14 : 0);
  const coherence =
    scoreDuration(params.duration, params.config.targetDuration, params.config.maxDuration) * 0.7 +
    (params.signals.endsAtSentenceBoundary ? 0.2 : 0) +
    (silenceRisk < 0.25 ? 0.1 : 0);
  const payoff =
    (params.signals.endsWithPayoffCue ? 0.42 : 0.16) +
    (params.signals.endsAtSentenceBoundary ? 0.34 : 0) +
    (params.signals.wordCount >= params.config.minWords ? 0.24 : 0);
  const total = clamp01(
    clamp01(hook) * 0.28 +
      clamp01(coherence) * 0.24 +
      clamp01(payoff) * 0.18 +
      clamp01(boundary) * 0.2 +
      (1 - fillerRisk) * 0.06 +
      (1 - silenceRisk) * 0.04
  );

  return {
    hook: clamp01(hook),
    coherence: clamp01(coherence),
    payoff: clamp01(payoff),
    boundary: clamp01(boundary),
    silenceRisk,
    fillerRisk,
    total,
  };
}

function getCandidateEndIndex(params: {
  words: WordTimestamp[];
  startIndex: number;
  minDuration: number;
  targetDuration: number;
  maxDuration: number;
}): number | null {
  const start = params.words[params.startIndex];
  if (!start) return null;

  let bestIndex: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = params.startIndex; index < params.words.length; index += 1) {
    const word = params.words[index];
    if (!word) continue;
    const duration = word.end - start.start;
    if (duration > params.maxDuration) break;
    if (duration < params.minDuration) continue;

    const boundaryBonus = endsSentence(word.word) ? -0.75 : 0;
    const distance = Math.abs(duration - params.targetDuration) + boundaryBonus;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function candidateId(rank: number): string {
  return `highlight-${String(rank).padStart(3, '0')}`;
}

function overlapsOrCrowds(
  candidate: HighlightCandidate,
  accepted: HighlightCandidate[],
  minGapSeconds: number
): boolean {
  return accepted.some((selected) => {
    const overlaps = candidate.start < selected.end && candidate.end > selected.start;
    const gap = Math.min(
      Math.abs(candidate.start - selected.end),
      Math.abs(selected.start - candidate.end)
    );
    return overlaps || gap < minGapSeconds;
  });
}

function withRejectionReasons(
  candidate: HighlightCandidate,
  minGapSeconds: number,
  accepted: HighlightCandidate[]
): HighlightCandidate {
  const rejectionReasons: string[] = [];
  if (candidate.scores.total < 0.45) rejectionReasons.push('low-total-score');
  if (candidate.scores.silenceRisk > 0.65) rejectionReasons.push('high-silence-risk');
  if (candidate.scores.fillerRisk > 0.65) rejectionReasons.push('high-filler-risk');
  if (overlapsOrCrowds(candidate, accepted, minGapSeconds)) {
    rejectionReasons.push('too-close-to-higher-ranked-candidate');
  }
  return { ...candidate, rejectionReasons };
}

function rankCandidates(
  candidates: HighlightCandidate[],
  config: HighlightSelectionParams
): HighlightCandidate[] {
  const ranked = [...candidates]
    .sort((left, right) => {
      const scoreDelta = right.scores.total - left.scores.total;
      if (scoreDelta !== 0) return scoreDelta;
      return left.start - right.start;
    })
    .map((candidate, index) => ({
      ...candidate,
      id: candidateId(index + 1),
      rank: index + 1,
    }));

  const accepted: HighlightCandidate[] = [];
  const annotated = ranked.map((candidate) => {
    const next = withRejectionReasons(candidate, config.minGapSeconds, accepted);
    if (next.rejectionReasons.length === 0 && accepted.length < config.maxCandidates) {
      accepted.push(next);
    }
    return next;
  });

  return annotated
    .filter((candidate) => accepted.some((selected) => selected.id === candidate.id))
    .slice(0, config.maxCandidates)
    .map((candidate, index) => ({ ...candidate, id: candidateId(index + 1), rank: index + 1 }));
}

function buildCandidate(params: {
  words: WordTimestamp[];
  startIndex: number;
  endIndex: number;
  config: HighlightSelectionParams;
  sourceAnalysis?: SourceMediaAnalysisOutput | null;
}): HighlightCandidate | null {
  const spanWords = params.words.slice(params.startIndex, params.endIndex + 1);
  const first = spanWords[0];
  const last = spanWords[spanWords.length - 1];
  if (!first || !last || spanWords.length < params.config.minWords) return null;

  const duration = last.end - first.start;
  if (duration < params.config.minDuration || duration > params.config.maxDuration) return null;

  const signals = calculateSignals({
    allWords: params.words,
    spanWords,
    startIndex: params.startIndex,
    endIndex: params.endIndex,
  });
  const scores = calculateScores({ duration, config: params.config, signals });
  const sourceSignals = calculateSourceSignals(signals, {
    start: first.start,
    end: last.end,
    sourceAnalysis: params.sourceAnalysis,
  });

  return {
    id: 'unranked',
    rank: 1,
    start: first.start,
    end: last.end,
    duration,
    text: joinWords(spanWords),
    wordStartIndex: params.startIndex,
    wordEndIndex: params.endIndex,
    scores,
    signals,
    sourceSignals,
    rejectionReasons: [],
    approval: 'pending',
    approvalNotes: null,
  };
}

function normalizeWords(timestamps: TimestampsOutput): WordTimestamp[] {
  return TimestampsOutputSchema.parse(timestamps)
    .allWords.filter(
      (word) => Number.isFinite(word.start) && Number.isFinite(word.end) && word.end >= word.start
    )
    .sort((left, right) => left.start - right.start);
}

export function selectHighlightCandidates(
  timestamps: TimestampsOutput,
  options: Partial<HighlightSelectionParams> & {
    timestampsPath?: string | null;
    sourceMediaPath?: string | null;
    sourceDuration?: number | null;
    sourceAnalysis?: SourceMediaAnalysisOutput | null;
  } = {}
): HighlightSelectionOutput {
  const { timestampsPath, sourceMediaPath, sourceDuration, sourceAnalysis, ...selectionOptions } =
    options;
  const config: HighlightSelectionParams = {
    ...DEFAULT_PARAMS,
    ...selectionOptions,
  };
  const words = normalizeWords(timestamps);
  const candidates: HighlightCandidate[] = [];

  for (let startIndex = 0; startIndex < words.length; startIndex += 1) {
    if (!startsSentence(words, startIndex) && startIndex % 8 !== 0) continue;
    const endIndex = getCandidateEndIndex({
      words,
      startIndex,
      minDuration: config.minDuration,
      targetDuration: config.targetDuration,
      maxDuration: config.maxDuration,
    });
    if (endIndex === null) continue;

    const candidate = buildCandidate({ words, startIndex, endIndex, config, sourceAnalysis });
    if (candidate) candidates.push(candidate);
  }

  const ranked = rankCandidates(candidates, config);
  const warnings =
    ranked.length === 0 ? ['No candidate spans met the duration and word-count limits'] : [];

  return HighlightSelectionOutputSchema.parse({
    schemaVersion: HIGHLIGHT_SELECTION_SCHEMA_VERSION,
    selectionMethod: 'deterministic-transcript-window-v1',
    source: {
      timestampsPath: timestampsPath ?? null,
      mediaPath: sourceMediaPath ?? null,
      sourceDuration: sourceDuration ?? timestamps.totalDuration ?? null,
    },
    params: config,
    spacingPolicy: {
      minGapSeconds: config.minGapSeconds,
      enforceNonOverlap: true,
    },
    selectedCandidateId: ranked[0]?.id ?? null,
    candidates: ranked,
    warnings,
  });
}
