import { access, readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { SchemaError } from '../core/errors';
import { resolvePackagePath, resolvePackageRoot } from '../core/package-root';
import {
  ProductionArchetypeRegistrySchema,
  type ProductionArchetypeRegistry,
} from './production-schema';

export const DEFAULT_PRODUCTION_ARCHETYPE_REGISTRY_PATH = resolvePackagePath(
  import.meta.url,
  'assets',
  'archetypes',
  'production',
  'registry.v1.json'
);

export interface ProductionArchetypeRegistryLoadOptions {
  registryPath?: string;
  validateImplementationPaths?: boolean;
}

export interface ProductionArchetypePathIssue {
  archetypeId: string;
  kind: 'skill' | 'flow' | 'harness' | 'template';
  path: string;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function resolveProductionArchetypeRegistryPath(input?: string): string {
  if (!input) return DEFAULT_PRODUCTION_ARCHETYPE_REGISTRY_PATH;
  return isAbsolute(input) ? input : resolve(process.cwd(), input);
}

export async function validateProductionArchetypeImplementationPaths(
  registry: ProductionArchetypeRegistry,
  packageRoot = resolvePackageRoot(import.meta.url)
): Promise<ProductionArchetypePathIssue[]> {
  const issues: ProductionArchetypePathIssue[] = [];

  for (const archetype of registry.archetypes) {
    const candidates: Array<{ kind: ProductionArchetypePathIssue['kind']; path: string }> = [
      ...archetype.implementation.skillIds.map((id) => ({
        kind: 'skill' as const,
        path: join(packageRoot, 'skills', id, 'SKILL.md'),
      })),
      ...archetype.implementation.flowPaths.map((path) => ({
        kind: 'flow' as const,
        path: join(packageRoot, path),
      })),
      ...archetype.implementation.harnessPaths.map((path) => ({
        kind: 'harness' as const,
        path: join(packageRoot, path),
      })),
      ...archetype.implementation.templateIds.map((id) => ({
        kind: 'template' as const,
        path: join(packageRoot, 'assets', 'templates', id, 'template.json'),
      })),
    ];

    for (const candidate of candidates) {
      if (!(await exists(candidate.path))) {
        issues.push({ archetypeId: archetype.id, ...candidate });
      }
    }
  }

  return issues;
}

export async function loadProductionArchetypeRegistry(
  options: ProductionArchetypeRegistryLoadOptions = {}
): Promise<{ registry: ProductionArchetypeRegistry; registryPath: string }> {
  const registryPath = resolveProductionArchetypeRegistryPath(options.registryPath);
  const raw = await readFile(registryPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new SchemaError('Invalid production archetype registry JSON', {
      registryPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const validated = ProductionArchetypeRegistrySchema.safeParse(parsed);
  if (!validated.success) {
    throw new SchemaError('Invalid production archetype registry', {
      registryPath,
      issues: validated.error.issues,
    });
  }

  if (options.validateImplementationPaths !== false) {
    const issues = await validateProductionArchetypeImplementationPaths(validated.data);
    if (issues.length > 0) {
      throw new SchemaError('Production archetype registry has missing implementation paths', {
        registryPath,
        issues,
      });
    }
  }

  return { registry: validated.data, registryPath };
}
