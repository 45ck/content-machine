/**
 * Quality Label Schema
 *
 * Zod schema for human quality labels used in training the quality scorer.
 * Labels follow a 5-point ordinal scale with subscores for specific quality dimensions.
 */
import { z } from 'zod';

const OrdinalScore = z.number().int().min(1).max(5);

/** Subscores for specific quality dimensions. */
export const QualitySubscoresSchema = z.object({
  hookEffectiveness: OrdinalScore.describe('1=no hook, 3=adequate, 5=exceptional'),
  clarityValue: OrdinalScore.describe('1=confusing, 3=clear, 5=outstanding'),
  captionReadability: OrdinalScore.describe('1=unreadable, 3=readable, 5=perfect'),
  audioCleanliness: OrdinalScore.describe('1=noisy/distorted, 3=clean, 5=studio quality'),
  pacingNatural: OrdinalScore.describe('1=rushed/dragging, 3=natural, 5=perfectly paced'),
  productionCoherence: OrdinalScore.describe('1=disjointed, 3=coherent, 5=polished'),
  captionSync: OrdinalScore.describe('1=completely out of sync, 3=acceptable, 5=perfect sync'),
  visualComposition: OrdinalScore.describe('1=poor framing/exposure, 3=acceptable, 5=cinematic'),
  sceneContinuity: OrdinalScore.describe('1=jarring cuts, 3=smooth, 5=seamless transitions'),
  policyRisk: OrdinalScore.describe('1=safe, 3=borderline, 5=high risk'),
});

/** Tags for categorizing labeled videos. */
export const QualityTagsSchema = z.object({
  niche: z.string().describe('Content niche, e.g. "finance", "cooking", "tech"'),
  format: z.string().describe('Video format, e.g. "listicle", "tutorial", "explainer"'),
  captionStyle: z.string().optional().describe('Caption style, e.g. "burned-in", "srt", "none"'),
  language: z.string().default('en').describe('ISO 639-1 language code'),
});

/** Schema for a single quality label entry. */
export const QualityLabelSchema = z.object({
  videoId: z.string().min(1),
  source: z.enum(['youtube', 'internal']),
  durationS: z.number().positive(),
  overallQuality: OrdinalScore.describe(
    '1=unpublishable, 2=poor, 3=average, 4=good, 5=exceptional'
  ),
  subscores: QualitySubscoresSchema,
  tags: QualityTagsSchema,
  defects: z
    .array(z.string())
    .default([])
    .describe(
      'Structured failure reasons, e.g. "caption_density_overflow", "audio_overlap_detected"'
    ),
  publishDecision: z.enum(['good', 'bad']).optional().describe('Derived from overallQuality >= 4'),
  notes: z.string().optional(),
  labeledAt: z.string().datetime().optional(),
  labeledBy: z.string().optional(),
});

/** Batch of quality labels (JSONL format, one per line). */
export const QualityLabelBatchSchema = z.array(QualityLabelSchema);

export type QualitySubscores = z.infer<typeof QualitySubscoresSchema>;
export type QualityTags = z.infer<typeof QualityTagsSchema>;
export type QualityLabel = z.infer<typeof QualityLabelSchema>;
