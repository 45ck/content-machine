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

export interface ArchetypeSpec {
  /** Stable identifier used by CLI flags and config defaults. */
  id: string;
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
