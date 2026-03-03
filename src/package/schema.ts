/**
 * Packaging Schemas
 *
 * Zod schemas for the optional packaging stage (`cm package`).
 * Packaging = title + cover text + muted autoplay hook text variants.
 */
import { z } from 'zod';

/** Current schema version for migrations */
export const PACKAGE_SCHEMA_VERSION = '1.0.0';

/**
 * Ubiquitous Language: Packaging platform enum.
 *
 * @cmTerm packaging-artifact
 */
export const PlatformEnum = z.enum(['tiktok', 'reels', 'shorts']);

/**
 * Ubiquitous Language: Packaging platform.
 *
 * @cmTerm packaging-artifact
 */
export type Platform = z.infer<typeof PlatformEnum>;

/**
 * A single packaging variant
 *
 * @cmTerm packaging-artifact
 */
export const PackageVariantSchema = z.object({
  title: z.string().min(3).max(140).describe('Video title'),
  coverText: z.string().min(1).max(40).describe('Cover/thumbnail text (mobile-readable)'),
  onScreenHook: z.string().min(1).max(60).describe('On-screen hook text for muted autoplay'),

  angle: z.string().optional().describe('Angle/positioning for this package'),

  // Added by generator scoring (not required from LLM)
  score: z.number().min(0).max(1).optional(),
  scoreBreakdown: z.record(z.number()).optional(),

  extra: z.record(z.unknown()).optional(),
});

/**
 * Ubiquitous Language: Packaging variant.
 *
 * @cmTerm packaging-artifact
 */
export type PackageVariant = z.infer<typeof PackageVariantSchema>;

export const PackageMetaSchema = z.object({
  generatedAt: z.string().datetime(),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
  llmCost: z.number().nonnegative().optional(),
});

/**
 * Ubiquitous Language: Packaging meta.
 */
export type PackageMeta = z.infer<typeof PackageMetaSchema>;

/**
 * Full package output artifact
 *
 * @cmTerm packaging-artifact
 */
export const PackageOutputSchema = z
  .object({
    schemaVersion: z.string().default(PACKAGE_SCHEMA_VERSION),
    topic: z.string().min(1),
    platform: PlatformEnum.default('tiktok'),
    variants: z.array(PackageVariantSchema).min(1),
    selectedIndex: z.number().int().nonnegative(),
    selected: PackageVariantSchema,
    meta: PackageMetaSchema,
    extra: z.record(z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.selectedIndex >= data.variants.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'selectedIndex out of range',
        path: ['selectedIndex'],
      });
      return;
    }

    const selected = data.variants[data.selectedIndex];
    if (
      selected.title !== data.selected.title ||
      selected.coverText !== data.selected.coverText ||
      selected.onScreenHook !== data.selected.onScreenHook
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'selected must match variants[selectedIndex]',
        path: ['selected'],
      });
    }
  });

/**
 * Ubiquitous Language: Packaging output artifact.
 *
 * @cmTerm packaging-artifact
 */
export type PackageOutput = z.infer<typeof PackageOutputSchema>;

/**
 * LLM response schema (minimal required fields)
 */
export const LLMPackageResponseSchema = z.object({
  variants: z.array(
    z.object({
      title: z.string(),
      coverText: z.string(),
      onScreenHook: z.string(),
      angle: z.string().optional(),
    })
  ),
  reasoning: z.string().optional(),
});

/**
 * Ubiquitous Language: Packaging LLM response (raw).
 */
export type LLMPackageResponse = z.infer<typeof LLMPackageResponseSchema>;
