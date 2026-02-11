import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const IdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'id must be kebab-case (lowercase letters/digits/hyphens)');

const ProviderSchema = z.object({
  id: IdSchema,
  displayName: z.string().min(1),
  envVarNames: z.array(z.string().min(1)).default([]),
  defaultModel: z.string().min(1).optional(),
  kind: z.enum(['stock', 'ai', 'local']).optional(),
  notes: z.string().min(1).optional(),
});
const MotionStrategyIdSchema = z.enum(['none', 'kenburns', 'depthflow', 'veo']);
const MotionStrategySchema = z.object({
  id: MotionStrategyIdSchema,
  displayName: z.string().min(1),
  description: z.string().min(1),
  costPerClip: z.number().nonnegative(),
  dependencies: z.array(z.string().min(1)).default([]),
});

const DocsConventionsSchema = z.object({
  dateSuffix: z.string().min(1),
  enforceDateSuffixInDirs: z.array(z.string().min(1)).default([]),
  undatedGlobs: z.array(z.string().min(1)).default([]),
});

const ArtifactSchema = z.object({
  id: IdSchema,
  stage: z.string().min(1),
  defaultFilename: z.string().min(1),
  description: z.string().min(1),
});

const ConfigFileSchema = z.object({
  id: IdSchema,
  path: z.string().min(1),
  purpose: z.string().min(1),
  secrets: z.boolean(),
});

const EnvironmentVariableSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[A-Z0-9_]+$/),
  required: z.boolean().default(false),
});

export const RepoFactsRegistrySchema = z.object({
  version: z.number().int().positive(),
  meta: z
    .object({
      repoName: z.string().min(1),
      repoId: z.string().min(1).optional(),
      owners: z
        .array(
          z.object({
            team: z.string().min(1),
            contact: z.string().min(1).optional(),
          })
        )
        .default([]),
      lastReviewed: z.string().min(1).optional(),
    })
    .default({ repoName: 'content-machine', owners: [] }),
  conventions: z
    .object({
      docs: DocsConventionsSchema,
    })
    .optional(),
  facts: z.object({
    runtime: z.object({
      node: z.object({
        supported: z.string().min(1),
        packageManager: z.string().min(1),
      }),
      language: z.object({
        primary: z.string().min(1),
      }),
    }),
    llm: z.object({
      supportedProviders: z.array(ProviderSchema).default([]),
      default: z.object({
        providerId: IdSchema,
        model: z.string().min(1),
        temperature: z.number(),
      }),
    }),
    visuals: z
      .object({
        defaultProviderId: IdSchema.optional(),
        defaultMotionStrategyId: MotionStrategyIdSchema.optional(),
        supportedProviders: z.array(ProviderSchema).default([]),
        motionStrategies: z.array(MotionStrategySchema).default([]),
      })
      .default({ supportedProviders: [], motionStrategies: [] }),
    stockVisuals: z
      .object({
        providerIds: z.array(IdSchema).default([]),
      })
      .default({ providerIds: [] }),
    spellcheck: z.object({
      cspell: z.object({
        configPath: z.string().min(1),
        generatedDictionaries: z
          .array(z.object({ name: z.string().min(1), path: z.string().min(1) }))
          .default([]),
        manualDictionaries: z
          .array(z.object({ name: z.string().min(1), path: z.string().min(1) }))
          .default([]),
      }),
    }),
    environment: z
      .object({
        variables: z.array(EnvironmentVariableSchema).default([]),
      })
      .default({ variables: [] }),
  }),
  artifacts: z.array(ArtifactSchema).default([]),
  configSurface: z
    .object({
      files: z.array(ConfigFileSchema).default([]),
      projectConfigCandidates: z.array(z.string().min(1)).default([]),
      userConfigCandidates: z.array(z.string().min(1)).default([]),
      precedence: z.array(z.string().min(1)).default([]),
    })
    .default({ files: [], projectConfigCandidates: [], userConfigCandidates: [], precedence: [] }),
  quality: z
    .object({
      requiredNpmScripts: z.array(z.string().min(1)).default([]),
      ci: z.object({
        workflowPath: z.string().min(1),
      }),
      docsValidation: z
        .object({
          markdownPaths: z.array(z.string().min(1)).default([]),
          ignoreLinkGlobs: z.array(z.string().min(1)).default([]),
        })
        .default({ markdownPaths: [], ignoreLinkGlobs: [] }),
    })
    .default({
      requiredNpmScripts: [],
      ci: { workflowPath: '.github/workflows/ci.yml' },
      docsValidation: { markdownPaths: [], ignoreLinkGlobs: [] },
    }),
  security: z
    .object({
      invariants: z.array(z.string().min(1)).default([]),
      bannedLogValuePatterns: z.array(z.string().min(1)).default([]),
    })
    .default({ invariants: [], bannedLogValuePatterns: [] }),
  cli: z
    .object({
      errorContract: z
        .object({
          errorPrefix: z.string().min(1),
          fixPrefix: z.string().min(1),
          note: z.string().min(1).optional(),
        })
        .default({ errorPrefix: 'ERROR:', fixPrefix: 'Fix:' }),
    })
    .default({ errorContract: { errorPrefix: 'ERROR:', fixPrefix: 'Fix:' } }),
  pipelinePresets: z
    .object({
      sync: z
        .object({
          defaultId: IdSchema.optional(),
          qualityDefaultId: IdSchema.optional(),
          configDefaultStrategy: z.enum(['standard', 'audio-first']).optional(),
          audioCommandDefaultStrategy: z.enum(['standard', 'audio-first']).optional(),
          presets: z
            .array(
              z.object({
                id: IdSchema,
                description: z.string().min(1),
                pipeline: z.enum(['standard', 'audio-first']).optional(),
                reconcile: z.boolean().optional(),
                syncQualityCheck: z.boolean().optional(),
                minSyncRating: z.number().optional(),
                autoRetrySync: z.boolean().optional(),
              })
            )
            .default([]),
        })
        .default({ presets: [] }),
    })
    .default({ sync: { presets: [] } }),
});

function assertUnique(label, values) {
  const seen = new Set();
  const dupes = [];
  for (const v of values) {
    if (seen.has(v)) dupes.push(v);
    seen.add(v);
  }
  if (dupes.length > 0) {
    throw new Error(`Duplicate ${label}: ${Array.from(new Set(dupes)).join(', ')}`);
  }
}

export function readRepoFactsRegistry(opts = {}) {
  const repoRoot = opts.repoRoot ?? process.cwd();
  const registryPath = opts.registryPath ?? path.join(repoRoot, 'registry', 'repo-facts.yaml');

  const raw = fs.readFileSync(registryPath, 'utf8');
  const parsed = parseYaml(raw);
  const registry = RepoFactsRegistrySchema.parse(parsed);

  assertUnique(
    'LLM provider id',
    registry.facts.llm.supportedProviders.map((p) => p.id)
  );
  assertUnique(
    'visuals provider id',
    registry.facts.visuals.supportedProviders.map((p) => p.id)
  );
  assertUnique('stock visuals provider id', registry.facts.stockVisuals.providerIds ?? []);

  assertUnique(
    'artifact id',
    (registry.artifacts ?? []).map((a) => a.id)
  );
  assertUnique(
    'config surface file id',
    (registry.configSurface?.files ?? []).map((f) => f.id)
  );

  for (const p of registry.facts.llm.supportedProviders) {
    assertUnique(`env var name for LLM provider ${p.id}`, p.envVarNames ?? []);
  }
  for (const p of registry.facts.visuals.supportedProviders) {
    assertUnique(`env var name for visuals provider ${p.id}`, p.envVarNames ?? []);
  }
  assertUnique(
    'environment variable name',
    registry.facts.environment.variables.map((v) => v.name)
  );
  assertUnique(
    'motion strategy id',
    registry.facts.visuals.motionStrategies.map((s) => s.id)
  );
  assertUnique(
    'sync preset id',
    (registry.pipelinePresets?.sync?.presets ?? []).map((p) => p.id)
  );

  const visualsProviderIds = new Set(registry.facts.visuals.supportedProviders.map((p) => p.id));
  const defaultVisualsProviderId = registry.facts.visuals.defaultProviderId;
  if (defaultVisualsProviderId && !visualsProviderIds.has(defaultVisualsProviderId)) {
    throw new Error(
      `facts.visuals.defaultProviderId not found in facts.visuals.supportedProviders: ${defaultVisualsProviderId}`
    );
  }

  const motionStrategyIds = new Set(registry.facts.visuals.motionStrategies.map((s) => s.id));
  const defaultMotionStrategyId = registry.facts.visuals.defaultMotionStrategyId;
  if (defaultMotionStrategyId && !motionStrategyIds.has(defaultMotionStrategyId)) {
    throw new Error(
      `facts.visuals.defaultMotionStrategyId not found in facts.visuals.motionStrategies: ${defaultMotionStrategyId}`
    );
  }

  for (const id of registry.facts.stockVisuals.providerIds) {
    if (!visualsProviderIds.has(id)) {
      throw new Error(
        `Stock visuals provider id not found in facts.visuals.supportedProviders: ${id}`
      );
    }
  }

  const syncPresetIds = new Set((registry.pipelinePresets?.sync?.presets ?? []).map((p) => p.id));
  const defaultSyncPresetId = registry.pipelinePresets?.sync?.defaultId;
  if (defaultSyncPresetId && !syncPresetIds.has(defaultSyncPresetId)) {
    throw new Error(
      `pipelinePresets.sync.defaultId not found in pipelinePresets.sync.presets: ${defaultSyncPresetId}`
    );
  }
  const qualityDefaultSyncPresetId = registry.pipelinePresets?.sync?.qualityDefaultId;
  if (qualityDefaultSyncPresetId && !syncPresetIds.has(qualityDefaultSyncPresetId)) {
    throw new Error(
      `pipelinePresets.sync.qualityDefaultId not found in pipelinePresets.sync.presets: ${qualityDefaultSyncPresetId}`
    );
  }

  // Preserve YAML ordering for readability (providers are sometimes intentionally ordered
  // by preference), but enforce uniqueness above so ordering cannot hide duplicates.
  return { registry, registryPath };
}
