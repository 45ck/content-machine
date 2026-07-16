import { z } from 'zod';
import { artifactFile, type HarnessToolResult } from './json-stdio';
import { loadProductionArchetypeRegistry } from '../archetypes/production-registry';
import {
  ProductionArchetypeFamilySchema,
  ProductionArchetypeStatusSchema,
  ProductionCostClassSchema,
} from '../archetypes/production-schema';

export const ArchetypeLaneCatalogRequestSchema = z
  .object({
    registryPath: z.string().min(1).optional(),
    ids: z.array(z.string().min(1)).optional(),
    families: z.array(ProductionArchetypeFamilySchema).optional(),
    statuses: z.array(ProductionArchetypeStatusSchema).optional(),
    costClasses: z.array(ProductionCostClassSchema).optional(),
    includeBacklog: z.boolean().default(true),
  })
  .strict();

export type ArchetypeLaneCatalogRequest = z.input<typeof ArchetypeLaneCatalogRequestSchema>;

/** Load and filter the source-aware production archetype registry. */
export async function listArchetypeLanes(request: ArchetypeLaneCatalogRequest): Promise<
  HarnessToolResult<{
    schemaVersion: string;
    registryPath: string;
    archetypeCount: number;
    archetypes: Array<{
      id: string;
      version: number;
      name: string;
      family: string;
      status: string;
      costClass: string;
      scriptArchetypeIds: string[];
      whenToUse: string[];
      whenNotToUse: string[];
      beatGrammar: unknown[];
      inputs: unknown[];
      rights: unknown;
      captionZones: unknown;
      audio: unknown;
      implementation: unknown;
      phoneViewport: unknown;
      redcowAffordances: string[];
      qualityRisks: string[];
    }>;
  }>
> {
  const normalized = ArchetypeLaneCatalogRequestSchema.parse(request);
  const { registry, registryPath } = await loadProductionArchetypeRegistry({
    registryPath: normalized.registryPath,
    validateImplementationPaths: true,
  });

  const ids = normalized.ids ? new Set(normalized.ids) : null;
  const families = normalized.families ? new Set(normalized.families) : null;
  const statuses = normalized.statuses ? new Set(normalized.statuses) : null;
  const costClasses = normalized.costClasses ? new Set(normalized.costClasses) : null;

  const archetypes = registry.archetypes.filter((archetype) => {
    if (!normalized.includeBacklog && archetype.status === 'backlog') return false;
    if (ids && !ids.has(archetype.id)) return false;
    if (families && !families.has(archetype.family)) return false;
    if (statuses && !statuses.has(archetype.status)) return false;
    if (costClasses && !costClasses.has(archetype.cost.class)) return false;
    return true;
  });

  return {
    result: {
      schemaVersion: registry.schemaVersion,
      registryPath,
      archetypeCount: archetypes.length,
      archetypes: archetypes.map((archetype) => ({
        id: archetype.id,
        version: archetype.version,
        name: archetype.name,
        family: archetype.family,
        status: archetype.status,
        costClass: archetype.cost.class,
        scriptArchetypeIds: archetype.scriptArchetypeIds,
        whenToUse: archetype.whenToUse,
        whenNotToUse: archetype.whenNotToUse,
        beatGrammar: archetype.beatGrammar,
        inputs: archetype.inputs,
        rights: archetype.rights,
        captionZones: archetype.captionZones,
        audio: archetype.audio,
        implementation: archetype.implementation,
        phoneViewport: archetype.phoneViewport,
        redcowAffordances: archetype.redcowAffordances,
        qualityRisks: archetype.qualityRisks,
      })),
    },
    artifacts: [artifactFile(registryPath, 'Validated production archetype registry')],
  };
}
