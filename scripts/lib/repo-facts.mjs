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
  kind: z.enum(['stock', 'ai', 'local']).optional(),
  notes: z.string().min(1).optional(),
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
        supportedProviders: z.array(ProviderSchema).default([]),
      })
      .default({ supportedProviders: [] }),
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
          presets: z.array(z.object({ id: IdSchema, description: z.string().min(1) })).default([]),
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

  const visualsProviderIds = new Set(registry.facts.visuals.supportedProviders.map((p) => p.id));
  for (const id of registry.facts.stockVisuals.providerIds) {
    if (!visualsProviderIds.has(id)) {
      throw new Error(
        `Stock visuals provider id not found in facts.visuals.supportedProviders: ${id}`
      );
    }
  }

  // Preserve YAML ordering for readability (providers are sometimes intentionally ordered
  // by preference), but enforce uniqueness above so ordering cannot hide duplicates.
  return { registry, registryPath };
}
