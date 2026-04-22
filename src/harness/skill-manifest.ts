import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

export const SkillManifestSchema = z
  .object({
    name: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().min(1).max(1024),
    allowedTools: z.array(z.string().min(1)).min(1),
    model: z.literal('inherit'),
    argumentHint: z.string().min(1),
    entrypoint: z.string().min(1),
    inputs: z
      .array(
        z
          .object({
            name: z.string().min(1),
            description: z.string().min(1),
            required: z.boolean(),
          })
          .strict()
      )
      .default([]),
    outputs: z
      .array(
        z
          .object({
            name: z.string().min(1),
            description: z.string().min(1),
          })
          .strict()
      )
      .default([]),
  })
  .strict();

export type SkillManifest = z.infer<typeof SkillManifestSchema>;

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;

/** Extract YAML frontmatter from a skill markdown document. */
export function extractFrontmatter(markdown: string): string {
  const match = markdown.match(FRONTMATTER_PATTERN);
  if (!match?.[1]) {
    throw new Error('Skill markdown is missing YAML frontmatter');
  }
  return match[1];
}

/** Parse and validate the skill manifest stored in SKILL.md frontmatter. */
export function parseSkillManifest(markdown: string): SkillManifest {
  const frontmatter = extractFrontmatter(markdown);
  const parsed = parseYaml(frontmatter) as unknown;
  return SkillManifestSchema.parse(parsed);
}

/** Load a skill manifest from disk. */
export async function loadSkillManifest(path: string): Promise<SkillManifest> {
  const markdown = await readFile(path, 'utf8');
  return parseSkillManifest(markdown);
}
