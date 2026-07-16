import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRODUCTION_ARCHETYPE_REGISTRY_PATH,
  loadProductionArchetypeRegistry,
  validateProductionArchetypeImplementationPaths,
} from './production-registry';
import { ProductionArchetypeRegistrySchema } from './production-schema';

const requiredFamilies = [
  'authentic-footage',
  'screen-proof',
  'stock',
  'ui-native',
  'generated-image',
  'generated-video',
  'motion-graphics',
  'spatial-3d',
  'story-gameplay',
  'evidence-reaction',
  'product-demo',
  'hybrid',
];

describe('production archetype registry', () => {
  it('loads the direct source registry and covers the required production families', async () => {
    const { registry, registryPath } = await loadProductionArchetypeRegistry();

    expect(registryPath).toBe(DEFAULT_PRODUCTION_ARCHETYPE_REGISTRY_PATH);
    expect(registry.archetypes).toHaveLength(13);
    expect(new Set(registry.archetypes.map((archetype) => archetype.family))).toEqual(
      new Set(requiredFamilies)
    );
    expect(registry.archetypes.every((archetype) => archetype.phoneViewport.width === 1080)).toBe(
      true
    );
    expect(registry.archetypes.every((archetype) => archetype.phoneViewport.height === 1920)).toBe(
      true
    );
  });

  it('resolves every declared skill, flow, harness, and template path', async () => {
    const { registry } = await loadProductionArchetypeRegistry({
      validateImplementationPaths: false,
    });
    await expect(validateProductionArchetypeImplementationPaths(registry)).resolves.toEqual([]);
  });

  it('keeps rights, cost, beat, zone, and affordance fields present for every archetype', async () => {
    const { registry } = await loadProductionArchetypeRegistry();

    for (const archetype of registry.archetypes) {
      expect(archetype.whenToUse.length).toBeGreaterThan(0);
      expect(archetype.whenNotToUse.length).toBeGreaterThan(0);
      expect(archetype.beatGrammar.length).toBeGreaterThanOrEqual(3);
      expect(archetype.inputs.length).toBeGreaterThan(0);
      expect(archetype.rights.hardStops.length).toBeGreaterThan(0);
      expect(['L0', 'L1', 'L2', 'L3']).toContain(archetype.cost.class);
      expect(archetype.captionZones.primary.width).toBeGreaterThan(0);
      expect(archetype.audio.requiredTracks.length).toBeGreaterThan(0);
      expect(archetype.phoneViewport.layers.length).toBeGreaterThanOrEqual(2);
      expect(archetype.patternSourceIds.length).toBeGreaterThan(0);
    }
  });

  it('rejects observed or platform-weight fields instead of turning the registry into analytics', async () => {
    const raw = JSON.parse(await readFile(DEFAULT_PRODUCTION_ARCHETYPE_REGISTRY_PATH, 'utf8'));
    raw.archetypes[0].platformWeight = 0.8;
    raw.archetypes[0].observedProbability = 0.7;

    const result = ProductionArchetypeRegistrySchema.safeParse(raw);

    expect(result.success).toBe(false);
  });
});
