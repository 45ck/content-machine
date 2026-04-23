import { access, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { artifactDirectory, type HarnessToolResult } from './json-stdio';
import { loadSkillManifest } from './skill-manifest';

export const SkillCatalogRequestSchema = z
  .object({
    skillsDir: z.string().min(1).default('skills'),
    includeTemplate: z.boolean().default(false),
    includeExamples: z.boolean().default(true),
  })
  .strict();

export type SkillCatalogRequest = z.input<typeof SkillCatalogRequestSchema>;

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Enumerate shipped skill manifests for harness-side discovery. */
export async function listSkillCatalog(request: SkillCatalogRequest): Promise<
  HarnessToolResult<{
    skillsDir: string;
    skillCount: number;
    skills: Array<{
      name: string;
      description: string;
      entrypoint: string;
      manifestPath: string;
      exampleRequestPath: string | null;
      allowedTools: string[];
      inputs: Array<{ name: string; description: string; required: boolean }>;
      outputs: Array<{ name: string; description: string }>;
    }>;
  }>
> {
  const normalized = SkillCatalogRequestSchema.parse(request);
  const skillsDir = resolve(normalized.skillsDir);
  const entries = await readdir(skillsDir, { withFileTypes: true });

  const skills = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => normalized.includeTemplate || entry.name !== '_template')
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const manifestPath = join(skillsDir, entry.name, 'SKILL.md');
        const manifest = await loadSkillManifest(manifestPath);
        const exampleRequestPath = join(skillsDir, entry.name, 'examples', 'request.json');

        return {
          name: manifest.name,
          description: manifest.description,
          entrypoint: manifest.entrypoint,
          manifestPath,
          exampleRequestPath:
            normalized.includeExamples && (await pathExists(exampleRequestPath))
              ? exampleRequestPath
              : null,
          allowedTools: manifest.allowedTools,
          inputs: manifest.inputs,
          outputs: manifest.outputs,
        };
      })
  );

  return {
    result: {
      skillsDir,
      skillCount: skills.length,
      skills,
    },
    artifacts: [artifactDirectory(skillsDir, 'Skill catalog root directory')],
  };
}
