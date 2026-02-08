/**
 * Domain model surface area for content-machine.
 *
 * This module is the centralized place to import:
 * - Zod schemas (artifact contracts)
 * - TypeScript types inferred from schemas
 * - Stable error taxonomy types
 *
 * It intentionally does NOT export pipelines, services, or side-effectful code to avoid cycles.
 */

/** Error taxonomy (stable codes + context). */
export * from '../core/errors';

/** Feedback schema + types. */
export * from '../feedback/schema';

/** Script artifact schema + types. */
export * from '../script/schema';
/** Audio artifact schema + types. */
export * from '../audio/schema';
/** Audio mix artifact schema + types. */
export * from '../audio/mix/schema';
/** Visuals artifact schema + types. */
export * from '../visuals/schema';
/** Hook asset schema + types. */
export * from '../hooks/schema';

/** Archetype schema + types. */
export * from '../archetypes/schema';

/**
 * Render schema exports are explicit to avoid name collisions with other domains
 * (e.g., `HookClip`, `HookClipInput`, `VideoClip`).
 */
export {
  RENDER_SCHEMA_VERSION,
  CaptionStyleSchema,
  FontSourceSchema,
  CaptionConfigSchema,
  RenderPropsSchema,
  RenderOutputSchema,
} from '../render/schema';

/** Render schema types (explicit to avoid collisions). */
export type {
  CaptionStyle,
  FontSource,
  CaptionConfig,
  RenderProps,
  RenderPropsInput,
  RenderOutput,
  VideoScene,
} from '../render/schema';
/** Packaging schema + types. */
export * from '../package/schema';
/** Publish schema + types. */
export * from '../publish/schema';
/** Research schema + types. */
export * from '../research/schema';
/** Workflow schema + types. */
export * from '../workflows/schema';
/** Validation schema + types. */
export * from '../validate/schema';
/** Scoring schema + types. */
export * from '../score/schema';
/** Sync scoring schema + types. */
export * from '../score/sync-schema';

/** Experiment Lab schemas + types. */
export * from '../lab/schema/run';
export * from '../lab/schema/experiment';
export * from '../lab/schema/export';
export * from '../lab/schema/idempotency';
