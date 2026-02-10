/**
 * Video Template Schema
 *
 * A "template" selects a Remotion composition and provides render defaults
 * (caption preset/config, orientation, fps, etc).
 *
 * Templates are data-only and schema-validated.
 */
import { z } from 'zod';
import { ArchetypeEnum, OrientationEnum } from '../../core/config';
import { CAPTION_STYLE_PRESETS, type CaptionPresetName } from '../captions/presets';
import { CaptionConfigSchema } from '../captions/config';
import { CompositionIdSchema, TemplateIdSchema } from '../../domain/ids';

const CaptionPresetNameSchema = z.enum(
  Object.keys(CAPTION_STYLE_PRESETS) as [CaptionPresetName, ...CaptionPresetName[]]
);

export const TemplatePackageManagerSchema = z.enum(['npm', 'pnpm', 'yarn']);
export type TemplatePackageManager = z.infer<typeof TemplatePackageManagerSchema>;

export const TemplateDependencyInstallModeSchema = z.enum(['auto', 'prompt', 'never']);
export type TemplateDependencyInstallMode = z.infer<typeof TemplateDependencyInstallModeSchema>;

/**
 * Ubiquitous Language: Code template project schema.
 *
 * When present on a Render Template, this points CM to a template-local Remotion project.
 * Security: This enables executing arbitrary JS/TS during bundling/rendering and must
 * be explicitly allowed by the caller.
 */
export const RemotionTemplateProjectSchema = z
  .object({
    /**
     * Path to the Remotion entrypoint (the file that calls `registerRoot()`).
     * Resolved relative to the template directory (or `rootDir` if set).
     */
    entryPoint: z.string().min(1),
    /**
     * Root directory for the Remotion project.
     * Resolved relative to the template directory.
     *
     * If omitted, defaults to the template directory itself.
     */
    rootDir: z.string().optional(),
    /**
     * Public directory to copy into the bundle (relative to `rootDir`).
     * Defaults to `public` if omitted.
     */
    publicDir: z.string().optional(),
    /**
     * Package manager to use when installing template dependencies.
     * If omitted, auto-detect via lockfiles (pnpm/yarn/npm).
     */
    packageManager: TemplatePackageManagerSchema.optional(),
    /**
     * Dependency installation mode.
     *
     * - auto: install automatically when missing (respects --offline)
     * - prompt: prompt in interactive CLIs (fallback to error in non-interactive)
     * - never: never install; user must install manually
     */
    installDeps: TemplateDependencyInstallModeSchema.optional(),
  })
  .strict();

export const VideoTemplateDefaultsSchema = z.object({
  orientation: OrientationEnum.optional(),
  fps: z.number().int().min(1).max(120).optional(),
  captionPreset: CaptionPresetNameSchema.optional(),
  captionConfig: CaptionConfigSchema.deepPartial().optional(),
  archetype: ArchetypeEnum.optional(),
});

/**
 * Ubiquitous Language: Render template schema (composition + defaults).
 */
export const VideoTemplateSchema = z.object({
  schemaVersion: z.string().default('1.0.0'),
  id: TemplateIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  compositionId: CompositionIdSchema,
  /**
   * Optional: A code template. When present, CM will bundle this Remotion project
   * instead of the built-in compositions.
   *
   * Security: This executes arbitrary JS/TS. It must be explicitly allowed by the caller.
   */
  remotion: RemotionTemplateProjectSchema.optional(),
  defaults: VideoTemplateDefaultsSchema.optional(),
  assets: z.record(z.unknown()).optional(),
  params: z.record(z.unknown()).optional(),
});

/**
 * Ubiquitous Language: Render template.
 *
 * Data-only template config validated by {@link VideoTemplateSchema}.
 */
export type VideoTemplate = z.infer<typeof VideoTemplateSchema>;
