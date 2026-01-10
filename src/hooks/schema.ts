/**
 * Hook schemas and types.
 *
 * Hooks are short intro clips used to stop the scroll in the first ~3 seconds.
 */
import { z } from 'zod';

export const HookAudioModeEnum = z.enum(['mute', 'keep']);
export const HookFitEnum = z.enum(['cover', 'contain']);
export const HookSourceEnum = z.enum(['library', 'file', 'url']);

// Short-form hook patterns (templates) used for labeling hook libraries.
export const HookPatternEnum = z.enum([
  'result-first',
  'direct-callout',
  'mistake',
  'contrarian',
  'curiosity-gap',
  'extreme-specificity',
  'in-medias-res',
  'challenge',
  'proof',
  'loop',
]);

// Psychological triggers for hook design (choose 1-2).
export const HookTriggerEnum = z.enum(['curiosity-gap', 'self-relevance', 'surprise', 'stakes', 'clarity']);

export const HookDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  url: z.string().url(),
  filename: z.string().min(1),
  duration: z.number().positive().optional(),
  patterns: z.array(HookPatternEnum).optional(),
  triggers: z.array(HookTriggerEnum).optional(),
  tags: z.array(z.string()).optional(),
  license: z.string().optional(),
});

export const HookClipSchema = z.object({
  path: z.string(),
  duration: z.number().positive(),
  mute: z.boolean().default(false),
  fit: HookFitEnum.default('cover'),
  source: HookSourceEnum.optional(),
  id: z.string().optional(),
  title: z.string().optional(),
});

export type HookAudioMode = z.infer<typeof HookAudioModeEnum>;
export type HookFit = z.infer<typeof HookFitEnum>;
export type HookSource = z.infer<typeof HookSourceEnum>;
export type HookPattern = z.infer<typeof HookPatternEnum>;
export type HookTrigger = z.infer<typeof HookTriggerEnum>;
export type HookDefinition = z.infer<typeof HookDefinitionSchema>;
export type HookClip = z.infer<typeof HookClipSchema>;
export type HookClipInput = z.input<typeof HookClipSchema>;
