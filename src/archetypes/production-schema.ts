import { z } from 'zod';

export const ProductionArchetypeFamilySchema = z.enum([
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
]);

export const ProductionArchetypeStatusSchema = z.enum([
  'implemented',
  'skill-backed',
  'proving',
  'backlog',
]);

export const ProductionCostClassSchema = z.enum(['L0', 'L1', 'L2', 'L3']);
export const RedcowAffordanceSchema = z.enum(['R', 'E', 'D', 'C', 'O', 'W']);

export const NormalizedRectSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .strict()
  .superRefine((rect, context) => {
    if (rect.x + rect.width > 1.000001) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'rect exceeds viewport width' });
    }
    if (rect.y + rect.height > 1.000001) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'rect exceeds viewport height' });
    }
  });

export const ProductionArchetypeSourceSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    kind: z.enum(['local-repository', 'public-repository', 'asset-license', 'skill-marketplace']),
    url: z.string().url().nullable(),
    licenseStatus: z.enum([
      'first-party-mit',
      'verified-permissive',
      'verified-copyleft',
      'asset-license',
      'needs-review',
    ]),
    usageMode: z.enum(['implementation', 'asset-source', 'pattern-only']),
    licenseReference: z.string().min(1).nullable(),
    notes: z.string().min(1),
  })
  .strict();

export const ProductionArchetypeInputSchema = z
  .object({
    kind: z.enum([
      'owned-video',
      'owned-audio',
      'screen-recording',
      'screenshot',
      'document-excerpt',
      'licensed-stock-video',
      'licensed-stock-image',
      'user-authored-text',
      'code-native-ui',
      'code-native-graphics',
      'generated-image',
      'generated-video',
      'generated-audio',
      'licensed-gameplay',
      'procedural-gameplay',
      'product-capture',
      'commentary-source-excerpt',
    ]),
    required: z.boolean(),
    sourceRule: z.string().min(1),
    acceptedRights: z
      .array(
        z.enum([
          'owned',
          'explicit-license',
          'stock-license',
          'public-domain',
          'generated-with-provenance',
          'quotation-review',
          'user-attested',
        ])
      )
      .min(1),
  })
  .strict();

export const ProductionBeatSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    purpose: z.string().min(1),
    visualRule: z.string().min(1),
    audioRule: z.string().min(1),
  })
  .strict();

export const PhoneViewportLayerSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    kind: z.enum(['video', 'image', 'ui', 'caption', 'graphic', 'mask']),
    rect: NormalizedRectSchema,
    zIndex: z.number().int(),
    content: z.string().min(1),
  })
  .strict();

export const ProductionArchetypeSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    version: z.number().int().positive(),
    name: z.string().min(1),
    family: ProductionArchetypeFamilySchema,
    status: ProductionArchetypeStatusSchema,
    scriptArchetypeIds: z.array(z.string().min(1)).min(1),
    whenToUse: z.array(z.string().min(1)).min(1),
    whenNotToUse: z.array(z.string().min(1)).min(1),
    beatGrammar: z.array(ProductionBeatSchema).min(3),
    inputs: z.array(ProductionArchetypeInputSchema).min(1),
    rights: z
      .object({
        defaultPosture: z.enum([
          'owned-or-explicitly-licensed',
          'licensed-stock',
          'generated-with-provenance',
          'quotation-or-commentary-review-required',
          'mixed-all-assets-cleared',
        ]),
        transformRule: z.string().min(1),
        hardStops: z.array(z.string().min(1)).min(1),
      })
      .strict(),
    cost: z
      .object({
        class: ProductionCostClassSchema,
        drivers: z.array(z.string().min(1)),
      })
      .strict(),
    captionZones: z
      .object({
        primary: NormalizedRectSchema,
        exclusions: z.array(NormalizedRectSchema),
      })
      .strict(),
    audio: z
      .object({
        narrationRequired: z.boolean(),
        requiredTracks: z
          .array(z.enum(['source-dialogue', 'narration', 'music', 'sfx', 'room-tone']))
          .min(1),
        mixRule: z.string().min(1),
      })
      .strict(),
    implementation: z
      .object({
        status: ProductionArchetypeStatusSchema,
        skillIds: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*$/)),
        flowPaths: z.array(z.string().min(1)),
        harnessPaths: z.array(z.string().min(1)),
        templateIds: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*$/)),
        nextGap: z.string().min(1).nullable(),
      })
      .strict(),
    phoneViewport: z
      .object({
        exampleId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
        width: z.literal(1080),
        height: z.literal(1920),
        layers: z.array(PhoneViewportLayerSchema).min(2),
      })
      .strict(),
    patternSourceIds: z.array(z.string().min(1)).min(1),
    redcowAffordances: z.array(RedcowAffordanceSchema),
    qualityRisks: z.array(z.string().min(1)).min(1),
  })
  .strict()
  .superRefine((archetype, context) => {
    if (archetype.status !== archetype.implementation.status) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'status must match implementation.status',
        path: ['implementation', 'status'],
      });
    }
    if (archetype.status !== 'backlog' && archetype.implementation.skillIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'non-backlog archetypes require at least one implementation skill',
        path: ['implementation', 'skillIds'],
      });
    }
  });

export const ProductionArchetypeRegistrySchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    kind: z.literal('content-machine-production-archetype-registry'),
    redcowBoundary: z.string().min(1),
    costClasses: z
      .record(
        ProductionCostClassSchema,
        z
          .object({
            label: z.string().min(1),
            rule: z.string().min(1),
          })
          .strict()
      )
      .refine((classes) => Object.keys(classes).length === 4, 'all four cost classes are required'),
    sources: z.array(ProductionArchetypeSourceSchema).min(1),
    archetypes: z.array(ProductionArchetypeSchema).min(1),
  })
  .strict()
  .superRefine((registry, context) => {
    const sourceIds = new Set<string>();
    registry.sources.forEach((source, index) => {
      if (sourceIds.has(source.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate source id: ${source.id}`,
          path: ['sources', index, 'id'],
        });
      }
      sourceIds.add(source.id);
    });

    const archetypeIds = new Set<string>();
    const exampleIds = new Set<string>();
    registry.archetypes.forEach((archetype, index) => {
      if (archetypeIds.has(archetype.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate archetype id: ${archetype.id}`,
          path: ['archetypes', index, 'id'],
        });
      }
      archetypeIds.add(archetype.id);

      if (exampleIds.has(archetype.phoneViewport.exampleId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate phone viewport example id: ${archetype.phoneViewport.exampleId}`,
          path: ['archetypes', index, 'phoneViewport', 'exampleId'],
        });
      }
      exampleIds.add(archetype.phoneViewport.exampleId);

      archetype.patternSourceIds.forEach((sourceId) => {
        if (!sourceIds.has(sourceId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `unknown pattern source id: ${sourceId}`,
            path: ['archetypes', index, 'patternSourceIds'],
          });
        }
      });
    });
  });

export type ProductionArchetype = z.infer<typeof ProductionArchetypeSchema>;
export type ProductionArchetypeRegistry = z.infer<typeof ProductionArchetypeRegistrySchema>;
