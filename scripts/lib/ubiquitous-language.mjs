import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const TermIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'term id must be kebab-case (lowercase letters/digits/hyphens)');

const BannedPhraseRuleSchema = z.object({
  phrase: z.string().min(1),
  fix: z.string().min(1),
});

const TermSchema = z.object({
  term: z.string().min(1),
  id: TermIdSchema,
  canonicalName: z.string().min(1),
  definition: z.string().min(1),
  nonExamples: z.array(z.string().min(1)).default([]),
  canonicalTypes: z.array(z.string().min(1)).default([]),
  canonicalSchemas: z.array(z.string().min(1)).default([]),
  ownedBy: z.string().min(1),
  whereItLives: z.array(z.string().min(1)).default([]),
  cliSurface: z.array(z.string().min(1)).default([]),
  synonymsToAvoid: z.array(z.string().min(1)).default([]),
});

export const UbiquitousLanguageRegistrySchema = z.object({
  version: z.number().int().positive(),
  enforcement: z
    .object({
      bannedPhrases: z.array(BannedPhraseRuleSchema).default([]),
    })
    .default({ bannedPhrases: [] }),
  terms: z.array(TermSchema),
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

export function readUbiquitousLanguageRegistry(opts = {}) {
  const repoRoot = opts.repoRoot ?? process.cwd();
  const registryPath =
    opts.registryPath ?? path.join(repoRoot, 'docs', 'reference', 'ubiquitous-language.yaml');

  const raw = fs.readFileSync(registryPath, 'utf8');
  const parsed = parseYaml(raw);
  const registry = UbiquitousLanguageRegistrySchema.parse(parsed);

  assertUnique(
    'term id',
    registry.terms.map((t) => t.id)
  );
  assertUnique(
    'canonicalName',
    registry.terms.map((t) => t.canonicalName)
  );

  // Ensure canonical export names are globally unique across all terms.
  const canonicalExports = [];
  for (const t of registry.terms) {
    for (const n of t.canonicalTypes) canonicalExports.push(n);
    for (const n of t.canonicalSchemas) canonicalExports.push(n);
  }
  assertUnique('canonical export name', canonicalExports.filter(Boolean));

  // Stable sort so diffs are deterministic for generators.
  const sorted = {
    ...registry,
    terms: [...registry.terms].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName)),
  };

  return { registry: sorted, registryPath };
}

export function buildCanonicalExportToTermIdMap(registry) {
  const out = new Map();
  for (const t of registry.terms) {
    for (const n of t.canonicalTypes) out.set(String(n), t.id);
    for (const n of t.canonicalSchemas) out.set(String(n), t.id);
  }
  return out;
}
