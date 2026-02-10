import type { ArchetypeId } from '../domain/ids';

export interface ArchetypeScriptSpec {
  /**
   * Prompt fragment describing format/requirements/structure.
   * The script generator will wrap this with common output rules, TTS guidance,
   * and optional packaging constraints.
   */
  template: string;
  /** Optional system prompt override for this archetype. */
  systemPrompt?: string;
}

/**
 * Ubiquitous Language: Script archetype spec.
 *
 * A data-only definition that constrains the script generator to a repeatable
 * format (hook + structure + pacing rules).
 *
 * @cmTerm script-archetype
 */
export interface ArchetypeSpec {
  /** Stable identifier used by CLI flags and config defaults. */
  id: ArchetypeId;
  /** Human-friendly name for UIs. */
  name: string;
  description?: string;
  version?: number;
  script: ArchetypeScriptSpec;
}

export type ArchetypeSource = 'builtin' | 'file';

export interface ArchetypeListEntry {
  id: string;
  name: string;
  description?: string;
  source: ArchetypeSource;
  path?: string;
}

export interface ResolvedArchetype {
  archetype: ArchetypeSpec;
  spec: string;
  source: ArchetypeSource;
  archetypePath?: string;
}
