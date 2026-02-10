/**
 * Ubiquitous Language: Canonical IDs
 *
 * These are branded string types used to make loaded terms unambiguous in code.
 *
 * See `docs/reference/GLOSSARY.md`.
 */
import { z } from 'zod';

type Brand<K extends string> = { readonly __brand: K };

/**
 * Ubiquitous Language: Script Archetype id.
 * A stable identifier for an archetype data file.
 */
export type ArchetypeId = string & Brand<'ArchetypeId'>;
/**
 * Ubiquitous Language: Script archetype id schema.
 */
export const ArchetypeIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9-]*$/i, 'id must be kebab-case (letters/digits/hyphens)')
  .transform((v) => v as ArchetypeId);

/**
 * Ubiquitous Language: Render Template id.
 * A stable identifier for a render template (composition + defaults).
 */
export type TemplateId = string & Brand<'TemplateId'>;
/**
 * Ubiquitous Language: Render template id schema.
 */
export const TemplateIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9-]*$/i, 'id must be kebab-case (letters/digits/hyphens)')
  .transform((v) => v as TemplateId);

/**
 * Ubiquitous Language: Pipeline Workflow id.
 * A stable identifier for a workflow definition (orchestration preset).
 */
export type WorkflowId = string & Brand<'WorkflowId'>;
/**
 * Ubiquitous Language: Pipeline workflow id schema.
 */
export const WorkflowIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9-]*$/i, 'id must be kebab-case (letters/digits/hyphens)')
  .transform((v) => v as WorkflowId);

/**
 * Ubiquitous Language: Visuals provider id.
 * E.g. pexels, pixabay, nanobanana, local.
 *
 * Note: stage-specific provider enums may constrain this further.
 */
export type VisualsProviderId = string & Brand<'VisualsProviderId'>;
/**
 * Ubiquitous Language: Visuals provider id schema.
 */
export const VisualsProviderIdSchema = z
  .string()
  .min(1)
  .transform((v) => v as VisualsProviderId);

/**
 * Ubiquitous Language: Remotion composition id.
 *
 * This is the string identifier passed to Remotion's `Composition id=...`
 * and referenced by `template.json` via `compositionId`.
 */
export type CompositionId = string;
/**
 * Ubiquitous Language: Remotion composition id schema.
 */
export const CompositionIdSchema = z.string().min(1);
