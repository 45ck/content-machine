import { z } from 'zod';

export const HIGHLIGHT_SELECTION_SCHEMA_VERSION = '1.0.0';
export const HIGHLIGHT_APPROVAL_SCHEMA_VERSION = '1.0.0';
export const BOUNDARY_SNAP_SCHEMA_VERSION = '1.0.0';
export const SOURCE_MEDIA_ANALYSIS_SCHEMA_VERSION = '1.0.0';

export const HighlightSelectionMethodSchema = z.enum(['deterministic-transcript-window-v1']);

export const HighlightApprovalSchema = z.enum(['pending', 'approved', 'rejected']);

export const HighlightCandidateScoresSchema = z
  .object({
    hook: z.number().min(0).max(1),
    coherence: z.number().min(0).max(1),
    payoff: z.number().min(0).max(1),
    boundary: z.number().min(0).max(1),
    silenceRisk: z.number().min(0).max(1),
    fillerRisk: z.number().min(0).max(1),
    total: z.number().min(0).max(1),
  })
  .strict();

export const HighlightCandidateSignalsSchema = z
  .object({
    wordCount: z.number().int().nonnegative(),
    leadingGapSeconds: z.number().nonnegative(),
    trailingGapSeconds: z.number().nonnegative(),
    maxInternalGapSeconds: z.number().nonnegative(),
    fillerWordCount: z.number().int().nonnegative(),
    startsAtSentenceBoundary: z.boolean(),
    endsAtSentenceBoundary: z.boolean(),
    startsWithHookCue: z.boolean(),
    endsWithPayoffCue: z.boolean(),
  })
  .strict();

export const HighlightCandidateSourceSignalsSchema = z
  .object({
    silenceBeforeSeconds: z.number().nonnegative(),
    silenceAfterSeconds: z.number().nonnegative(),
    internalSilenceSeconds: z.number().nonnegative(),
    fillerOnlySegmentCount: z.number().int().nonnegative(),
    audioEnergyScore: z.number().min(0).max(1).nullable(),
    sceneChangeScore: z.number().min(0).max(1).nullable(),
    llmNarrativeScore: z.number().min(0).max(1).nullable(),
  })
  .strict();

export const HighlightCandidateSchema = z
  .object({
    id: z.string().min(1),
    rank: z.number().int().positive(),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    duration: z.number().positive(),
    text: z.string().min(1),
    wordStartIndex: z.number().int().nonnegative(),
    wordEndIndex: z.number().int().nonnegative(),
    scores: HighlightCandidateScoresSchema,
    signals: HighlightCandidateSignalsSchema,
    sourceSignals: HighlightCandidateSourceSignalsSchema,
    rejectionReasons: z.array(z.string().min(1)).default([]),
    approval: HighlightApprovalSchema.default('pending'),
    approvalNotes: z.string().nullable().default(null),
  })
  .strict()
  .refine((value) => value.end >= value.start, { message: 'end must be >= start' })
  .refine((value) => value.wordEndIndex >= value.wordStartIndex, {
    message: 'wordEndIndex must be >= wordStartIndex',
  });

export const HighlightSelectionParamsSchema = z
  .object({
    minDuration: z.number().positive(),
    targetDuration: z.number().positive(),
    maxDuration: z.number().positive(),
    maxCandidates: z.number().int().positive(),
    minWords: z.number().int().positive(),
    minGapSeconds: z.number().nonnegative(),
  })
  .strict()
  .refine((value) => value.maxDuration >= value.minDuration, {
    message: 'maxDuration must be >= minDuration',
  })
  .refine((value) => value.targetDuration >= value.minDuration, {
    message: 'targetDuration must be >= minDuration',
  })
  .refine((value) => value.targetDuration <= value.maxDuration, {
    message: 'targetDuration must be <= maxDuration',
  });

export const HighlightSelectionOutputSchema = z
  .object({
    schemaVersion: z.string().default(HIGHLIGHT_SELECTION_SCHEMA_VERSION),
    selectionMethod: HighlightSelectionMethodSchema.default('deterministic-transcript-window-v1'),
    source: z
      .object({
        timestampsPath: z.string().min(1).nullable(),
        mediaPath: z.string().min(1).nullable(),
        sourceDuration: z.number().positive().nullable(),
      })
      .strict(),
    params: HighlightSelectionParamsSchema,
    spacingPolicy: z
      .object({
        minGapSeconds: z.number().nonnegative(),
        enforceNonOverlap: z.boolean(),
      })
      .strict(),
    selectedCandidateId: z.string().min(1).nullable(),
    candidates: z.array(HighlightCandidateSchema),
    warnings: z.array(z.string()),
  })
  .strict();

export const HighlightApprovalDecisionSchema = z
  .object({
    candidateId: z.string().min(1),
    approval: z.enum(['approved', 'rejected']),
    notes: z.string().nullable().default(null),
    renderOrder: z.number().int().positive().nullable().default(null),
  })
  .strict();

export const HighlightApprovalOutputSchema = z
  .object({
    schemaVersion: z.string().default(HIGHLIGHT_APPROVAL_SCHEMA_VERSION),
    sourceCandidatesPath: z.string().min(1),
    actor: z.string().min(1),
    decidedAt: z.string().min(1),
    approvedCandidateIds: z.array(z.string().min(1)),
    rejectedCandidateIds: z.array(z.string().min(1)),
    decisions: z.array(HighlightApprovalDecisionSchema),
    candidates: z.array(HighlightCandidateSchema),
    warnings: z.array(z.string()),
  })
  .strict();

export const BoundarySnapReasonSchema = z.enum([
  'sentence-boundary',
  'silence-boundary',
  'duration-clamp',
  'source-boundary',
]);

export const BoundarySnapOutputSchema = z
  .object({
    schemaVersion: z.string().default(BOUNDARY_SNAP_SCHEMA_VERSION),
    sourceCandidatesPath: z.string().min(1),
    sourceTimestampsPath: z.string().min(1),
    snappedAt: z.string().min(1),
    candidates: z.array(
      z
        .object({
          id: z.string().min(1),
          originalStart: z.number().nonnegative(),
          originalEnd: z.number().nonnegative(),
          snappedStart: z.number().nonnegative(),
          snappedEnd: z.number().nonnegative(),
          duration: z.number().positive(),
          wordStartIndex: z.number().int().nonnegative(),
          wordEndIndex: z.number().int().nonnegative(),
          reasons: z.array(BoundarySnapReasonSchema),
        })
        .strict()
        .refine((value) => value.snappedEnd >= value.snappedStart, {
          message: 'snappedEnd must be >= snappedStart',
        })
    ),
    warnings: z.array(z.string()),
  })
  .strict();

export const SourceMediaAnalysisOutputSchema = z
  .object({
    schemaVersion: z.string().default(SOURCE_MEDIA_ANALYSIS_SCHEMA_VERSION),
    mediaPath: z.string().min(1),
    analyzedAt: z.string().min(1),
    probe: z
      .object({
        engine: z.literal('ffprobe'),
        durationSeconds: z.number().positive().nullable(),
        width: z.number().int().positive().nullable(),
        height: z.number().int().positive().nullable(),
        fps: z.number().positive().nullable(),
        hasAudio: z.boolean(),
        hasVideo: z.boolean(),
        orientation: z.enum(['portrait', 'landscape', 'square', 'unknown']),
        videoCodec: z.string().nullable(),
        audioCodec: z.string().nullable(),
        container: z.string().nullable(),
      })
      .strict(),
    sourceSignals: z
      .object({
        audioEnergyScore: z.number().min(0).max(1).nullable(),
        sceneChangeScore: z.number().min(0).max(1).nullable(),
        sampledFrameCount: z.number().int().nonnegative(),
        estimatedSceneCount: z.number().int().nonnegative().nullable(),
      })
      .strict(),
    warnings: z.array(z.string()),
  })
  .strict();

export type HighlightApproval = z.infer<typeof HighlightApprovalSchema>;
export type HighlightSelectionMethod = z.infer<typeof HighlightSelectionMethodSchema>;
export type HighlightCandidateScores = z.infer<typeof HighlightCandidateScoresSchema>;
export type HighlightCandidateSignals = z.infer<typeof HighlightCandidateSignalsSchema>;
export type HighlightCandidateSourceSignals = z.infer<typeof HighlightCandidateSourceSignalsSchema>;
export type HighlightCandidate = z.infer<typeof HighlightCandidateSchema>;
export type HighlightSelectionParams = z.infer<typeof HighlightSelectionParamsSchema>;
export type HighlightSelectionOutput = z.infer<typeof HighlightSelectionOutputSchema>;
export type HighlightApprovalDecision = z.infer<typeof HighlightApprovalDecisionSchema>;
export type HighlightApprovalOutput = z.infer<typeof HighlightApprovalOutputSchema>;
export type BoundarySnapOutput = z.infer<typeof BoundarySnapOutputSchema>;
export type SourceMediaAnalysisOutput = z.infer<typeof SourceMediaAnalysisOutputSchema>;
