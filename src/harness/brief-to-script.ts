import { resolve } from 'node:path';
import { z } from 'zod';
import { ArchetypeEnum, loadConfig } from '../core/config';
import { createLLMProvider } from '../core/llm';
import {
  PackageOutputSchema,
  ResearchOutputSchema,
  ScriptOutputSchema,
  VideoBlueprintV1Schema,
  type PackageOutput,
  type ResearchOutput,
  type VideoBlueprintV1,
} from '../domain';
import { writeJsonArtifact, readJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';
import { generateScript } from '../script/generator';

export const BriefToScriptRequestSchema = z
  .object({
    topic: z.string().min(1),
    archetype: ArchetypeEnum.default('listicle'),
    targetDuration: z.number().positive().default(45),
    outputPath: z.string().min(1).default('output/harness/script/script.json'),
    packagingPath: z.string().min(1).optional(),
    blueprintPath: z.string().min(1).optional(),
    researchPath: z.string().min(1).optional(),
    llmProvider: z.enum(['default', 'openai', 'anthropic', 'gemini']).default('default'),
  })
  .strict();

export type BriefToScriptRequest = z.infer<typeof BriefToScriptRequestSchema>;

/** Generate a script artifact from a brief plus optional upstream artifacts. */
export async function generateBriefToScript(
  request: BriefToScriptRequest
): Promise<HarnessToolResult<{ outputPath: string; title: string | null; sceneCount: number }>> {
  const outputPath = resolve(request.outputPath);
  const packaging: PackageOutput | undefined = request.packagingPath
    ? await readJsonArtifact(request.packagingPath, PackageOutputSchema, 'packaging artifact')
    : undefined;
  const blueprint: VideoBlueprintV1 | undefined = request.blueprintPath
    ? await readJsonArtifact(request.blueprintPath, VideoBlueprintV1Schema, 'blueprint artifact')
    : undefined;
  const research: ResearchOutput | undefined = request.researchPath
    ? await readJsonArtifact(request.researchPath, ResearchOutputSchema, 'research artifact')
    : undefined;

  let llmProvider;
  if (request.llmProvider !== 'default') {
    const config = await loadConfig();
    llmProvider = createLLMProvider(request.llmProvider, config.llm.model);
  }

  const script = await generateScript({
    topic: request.topic,
    archetype: request.archetype,
    targetDuration: request.targetDuration,
    llmProvider,
    packaging: packaging?.selected
      ? {
          title: packaging.selected.title,
          coverText: packaging.selected.coverText,
          onScreenHook: packaging.selected.onScreenHook,
        }
      : undefined,
    blueprint,
    research,
  });

  const validated = ScriptOutputSchema.parse(script);
  await writeJsonArtifact(outputPath, validated);

  return {
    result: {
      outputPath,
      title: validated.title ?? null,
      sceneCount: validated.scenes.length,
    },
    artifacts: [artifactFile(outputPath, 'Generated script artifact')],
  };
}
