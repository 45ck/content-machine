import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { resolvePackagePath } from '../core/package-root';
import {
  loadProductionArchetypeRegistry,
  validateProductionArchetypeImplementationPaths,
} from './production-registry';
import { ProductionArchetypeRegistrySchema } from './production-schema';

const tranchePath = resolvePackagePath(
  import.meta.url,
  'assets',
  'archetypes',
  'production',
  'tranches',
  'tranche-02-product-native.v1.json'
);

const expectedIds = [
  'ugc-avatar-product-proof',
  'comment-reply-short',
  'document-to-gameplay-explainer',
  'before-after-transformation-proof',
  'search-intent-answer',
  'review-mined-product-proof',
];

describe('production archetype registry tranche 02', () => {
  it('loads exactly the six product-native archetypes from the direct checkout', async () => {
    const { registry, registryPath } = await loadProductionArchetypeRegistry({
      registryPath: tranchePath,
    });

    expect(registryPath).toBe(tranchePath);
    expect(registry.archetypes.map((archetype) => archetype.id)).toEqual(expectedIds);
    expect(registry.archetypes.every((archetype) => archetype.phoneViewport.width === 1080)).toBe(
      true
    );
    expect(registry.archetypes.every((archetype) => archetype.phoneViewport.height === 1920)).toBe(
      true
    );
  });

  it('resolves every declared direct-checkout implementation path', async () => {
    const { registry } = await loadProductionArchetypeRegistry({
      registryPath: tranchePath,
      validateImplementationPaths: false,
    });

    await expect(validateProductionArchetypeImplementationPaths(registry)).resolves.toEqual([]);
  });

  it('keeps rights, cost, negative-fit, beat, and phone-layout constraints explicit', async () => {
    const { registry } = await loadProductionArchetypeRegistry({ registryPath: tranchePath });

    for (const archetype of registry.archetypes) {
      expect(archetype.whenToUse.length).toBeGreaterThan(0);
      expect(archetype.whenNotToUse.length).toBeGreaterThan(0);
      expect(archetype.beatGrammar).toHaveLength(4);
      expect(archetype.rights.hardStops.length).toBeGreaterThanOrEqual(4);
      expect(['L0', 'L1', 'L2', 'L3']).toContain(archetype.cost.class);
      expect(archetype.cost.drivers.length).toBeGreaterThan(0);
      expect(archetype.phoneViewport.layers.length).toBeGreaterThanOrEqual(2);
      expect(archetype.redcowAffordances).toEqual([]);
    }
  });

  it('encodes testimonial, transformation, source, and identity hard stops', async () => {
    const { registry } = await loadProductionArchetypeRegistry({ registryPath: tranchePath });
    const byId = new Map(registry.archetypes.map((archetype) => [archetype.id, archetype]));

    expect(byId.get('ugc-avatar-product-proof')?.rights.hardStops.join(' ')).toMatch(
      /consent|synthetic|material connection|typical/i
    );
    expect(byId.get('before-after-transformation-proof')?.rights.hardStops.join(' ')).toMatch(
      /mismatched|retouch|consent|typical/i
    );
    expect(byId.get('document-to-gameplay-explainer')?.rights.hardStops.join(' ')).toMatch(
      /unknown|copied|downloaded|attribution/i
    );
    expect(byId.get('review-mined-product-proof')?.rights.hardStops.join(' ')).toMatch(
      /fake|permission|incentive|material connection|platform UI/i
    );
  });

  it('rejects publishing, platform-weight, and observed-probability fields', async () => {
    const raw = JSON.parse(await readFile(tranchePath, 'utf8'));
    raw.archetypes[0].publish = true;
    raw.archetypes[0].platformWeight = 0.8;
    raw.archetypes[0].observedProbability = 0.7;

    expect(ProductionArchetypeRegistrySchema.safeParse(raw).success).toBe(false);
  });
});
