import type { ArchetypeSpec } from '../domain';

export type { ArchetypeSpec } from '../domain';

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
