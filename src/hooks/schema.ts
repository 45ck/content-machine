/**
 * Hook schemas and types.
 *
 * Hooks are short intro clips used to stop the scroll in the first ~3 seconds.
 */
import { z } from 'zod';

/**
 * Ubiquitous Language: Hook audio mode.
 *
 * - mute: mute hook audio
 * - keep: keep hook audio
 *
 * @cmTerm hook-clip
 */
export const HookAudioModeEnum = z.enum(['mute', 'keep']);

/**
 * Ubiquitous Language: Hook fit mode (how the hook video fits its container).
 *
 * @cmTerm hook-clip
 */
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
export const HookTriggerEnum = z.enum([
  'curiosity-gap',
  'self-relevance',
  'surprise',
  'stakes',
  'clarity',
]);

/**
 * Ubiquitous Language: Hook definition entry (library metadata).
 *
 * @cmTerm hook-clip
 */
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

/**
 * Ubiquitous Language: Hook clip (resolved clip used in rendering).
 *
 * @cmTerm hook-clip
 */
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
/**
 * Ubiquitous Language: Hook definition (library item).
 *
 * A selectable hook option (id, title, source URL/file) that can be resolved
 * into a concrete {@link HookClip}.
 *
 * @cmTerm hook-clip
 */
export type HookDefinition = z.infer<typeof HookDefinitionSchema>;
/**
 * Ubiquitous Language: Hook clip (resolved asset).
 *
 * A concrete video clip (path + timing + fit/mute) used at render-time.
 *
 * @cmTerm hook-clip
 */
export type HookClip = z.infer<typeof HookClipSchema>;
export type HookClipInput = z.input<typeof HookClipSchema>;
