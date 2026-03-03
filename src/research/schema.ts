/**
 * Research Module - Zod Schemas
 */
import { z } from 'zod';

export const ResearchSourceEnum = z.enum(['hackernews', 'reddit', 'web', 'tavily', 'youtube', 'twitter']);
export type ResearchSource = z.infer<typeof ResearchSourceEnum>;

export const EvidenceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  source: ResearchSourceEnum,
  relevanceScore: z.number().min(0).max(1),
  publishedAt: z.string().optional(),
  summary: z.string().optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const TrendingTopicSchema = z.object({
  topic: z.string().min(1),
  score: z.number().min(0),
  source: ResearchSourceEnum,
  url: z.string().url().optional(),
  velocity: z.enum(['rising', 'stable', 'falling']).optional(),
});
export type TrendingTopic = z.infer<typeof TrendingTopicSchema>;

export const ContentAngleSchema = z.object({
  angle: z.string().min(1),
  hook: z.string().min(1),
  archetype: z.string().min(1),
  targetEmotion: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type ContentAngle = z.infer<typeof ContentAngleSchema>;

export const ResearchOutputSchema = z.object({
  query: z.string().min(1),
  evidence: z.array(EvidenceSchema),
  trendingTopics: z.array(TrendingTopicSchema).optional(),
  suggestedAngles: z.array(ContentAngleSchema).optional(),
  searchedAt: z.string(),
  sources: z.array(ResearchSourceEnum),
  totalResults: z.number().int().min(0),
});
export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;
