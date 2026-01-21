/**
 * Script Generator
 *
 * Generates video scripts using LLM with archetype-specific prompts.
 * Based on SYSTEM-DESIGN §7.1 cm script command.
 */
import { createLLMProvider, LLMProvider, calculateLLMCost } from '../core/llm';
import { loadConfig, Archetype } from '../core/config';
import { SchemaError } from '../core/errors';
import { createLogger } from '../core/logger';
import {
  ScriptOutputSchema,
  LLMScriptResponseSchema,
  SCRIPT_SCHEMA_VERSION,
  type Scene,
  type ScriptOutput,
} from '../domain';
import { getPromptForArchetype } from './prompts';
import { buildResearchContext, extractSourceUrls } from './research-context';
import { sanitizeSpokenText } from './sanitize';
import type { ResearchOutput } from '../domain';

export type { ScriptOutput, Scene } from '../domain';
// Re-export deprecated type for backward compatibility
export type { ScriptSection } from '../domain';

export interface GenerateScriptOptions {
  topic: string;
  archetype: Archetype;
  targetDuration?: number;
  llmProvider?: LLMProvider;
  packaging?: {
    title: string;
    coverText: string;
    onScreenHook: string;
  };
  /** Research output to inject evidence into script */
  research?: ResearchOutput;
}

/**
 * Parse and validate LLM response
 */
function parseLLMResponse(
  content: string,
  log: ReturnType<typeof createLogger>
): ReturnType<typeof LLMScriptResponseSchema.parse> {
  try {
    const parsed = JSON.parse(content);
    return LLMScriptResponseSchema.parse(parsed);
  } catch (error) {
    log.error({ error, content }, 'Failed to parse LLM response');
    throw new SchemaError('LLM returned invalid script format', {
      content: content.slice(0, 500),
    });
  }
}

/**
 * Transform LLM response to ScriptOutput
 */
function buildScriptOutput(
  llmResponse: ReturnType<typeof LLMScriptResponseSchema.parse>,
  options: GenerateScriptOptions,
  responseModel?: string,
  totalTokens?: number
): ScriptOutput {
  const scenes: Scene[] = llmResponse.scenes.map((scene, index) => ({
    id: `scene-${String(index + 1).padStart(3, '0')}`,
    text: sanitizeSpokenText(scene.text) ?? '',
    visualDirection: scene.visualDirection,
    mood: scene.mood,
  }));

  const hook = sanitizeSpokenText(llmResponse.hook);
  const cta = sanitizeSpokenText(llmResponse.cta);

  const allText = [hook, ...scenes.map((s) => s.text), cta].filter(Boolean).join(' ');
  const wordCount = allText.split(/\s+/).filter(Boolean).length;
  const estimatedDuration = wordCount / 2.5;
  const title = options.packaging?.title ?? llmResponse.title;

  // Build extra field with research metadata if available
  const extra: Record<string, unknown> = {};
  if (options.packaging) {
    extra.virality = { packaging: options.packaging };
  }
  if (options.research && options.research.evidence.length > 0) {
    extra.research = {
      sources: extractSourceUrls(options.research),
      evidenceCount: options.research.evidence.length,
      query: options.research.query,
    };
  }

  return {
    schemaVersion: SCRIPT_SCHEMA_VERSION,
    scenes,
    reasoning: llmResponse.reasoning,
    title,
    hook,
    cta,
    hashtags: llmResponse.hashtags,
    meta: {
      wordCount,
      estimatedDuration,
      archetype: options.archetype,
      topic: options.topic,
      generatedAt: new Date().toISOString(),
      model: responseModel,
      llmCost: calculateLLMCost(totalTokens ?? 0, responseModel ?? 'gpt-4o'),
    },
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

function getWordCountBounds(targetWordCount: number): {
  minWordCount: number;
  maxWordCount: number;
} {
  const minWordCount = Math.max(60, Math.round(targetWordCount * 0.8));
  const maxWordCount = Math.max(minWordCount + 20, Math.round(targetWordCount * 1.25));
  return { minWordCount, maxWordCount };
}

function normalizeForDedupe(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function overlapRatio(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const aSet = new Set(aTokens);
  let common = 0;
  for (const t of bTokens) {
    if (aSet.has(t)) common++;
  }
  return common / Math.max(1, Math.min(aTokens.length, bTokens.length));
}

function dedupeHookFromFirstScene(output: ScriptOutput): ScriptOutput {
  if (!output.hook || output.scenes.length === 0) return output;

  const first = output.scenes[0];
  const match = first.text.match(/^(.+?[.!?])(\s+|$)(.*)$/s);
  if (!match) return output;

  const firstSentence = match[1] ?? '';
  const rest = (match[3] ?? '').trim();
  if (!firstSentence || !rest) return output;

  const hookTokens = normalizeForDedupe(output.hook);
  const sentenceTokens = normalizeForDedupe(firstSentence);
  if (hookTokens.length < 5 || sentenceTokens.length < 5) return output;

  // If the first sentence largely repeats the hook, drop it to avoid annoying duplication.
  if (overlapRatio(hookTokens, sentenceTokens) >= 0.72) {
    const updatedScenes = [...output.scenes];
    updatedScenes[0] = { ...first, text: rest };

    const allText = [output.hook, ...updatedScenes.map((s) => s.text), output.cta]
      .filter(Boolean)
      .join(' ');
    const wordCount = allText.split(/\s+/).filter(Boolean).length;
    const estimatedDuration = wordCount / 2.5;

    return {
      ...output,
      scenes: updatedScenes,
      meta: output.meta
        ? {
            ...output.meta,
            wordCount,
            estimatedDuration,
          }
        : output.meta,
    };
  }

  return output;
}

/**
 * Generate a script from a topic using the specified archetype
 */
export async function generateScript(options: GenerateScriptOptions): Promise<ScriptOutput> {
  const log = createLogger({ module: 'script', topic: options.topic });
  const config = await loadConfig();
  const llm = options.llmProvider ?? createLLMProvider(config.llm.provider, config.llm.model);

  const targetDuration = options.targetDuration ?? 45;
  const targetWordCount = Math.round(targetDuration * 2.5);
  const { maxWordCount } = getWordCountBounds(targetWordCount);

  log.info({ archetype: options.archetype, targetDuration, targetWordCount }, 'Generating script');

  let prompt = getPromptForArchetype(options.archetype, {
    topic: options.topic,
    targetWordCount,
    targetDuration,
    packaging: options.packaging,
  });

  // Inject research context if available
  if (options.research && options.research.evidence.length > 0) {
    const researchContext = buildResearchContext(options.research);
    if (researchContext) {
      prompt = `${researchContext}\n\n---\n\n${prompt}`;
      log.info({ evidenceCount: options.research.evidence.length }, 'Injected research context');
    }
  }

  const response = await llm.chat(
    [
      {
        role: 'system',
        content: `You are an expert short-form video scriptwriter. You write engaging scripts for TikTok, Reels, and YouTube Shorts. Your scripts are punchy, conversational, and optimized for viewer retention. Always respond with valid JSON.`,
      },
      { role: 'user', content: prompt },
    ],
    { temperature: config.llm.temperature ?? 0.7, maxTokens: 2000, jsonMode: true }
  );

  let llmResponse = parseLLMResponse(response.content, log);
  let output = buildScriptOutput(llmResponse, options, response.model, response.usage?.totalTokens);

  if ((output.meta?.wordCount ?? 0) > maxWordCount) {
    log.warn(
      {
        wordCount: output.meta?.wordCount,
        estimatedDuration: output.meta?.estimatedDuration,
        maxWordCount,
        targetDuration,
      },
      'Script is longer than target. Attempting to shorten.'
    );

    const rewrite = await llm.chat(
      [
        {
          role: 'system',
          content:
            'You are an expert short-form script editor. Rewrite the provided JSON script to fit the word limit while preserving the topic, structure, and factuality. Do not add new factual claims. Keep the same number of scenes. Output ONLY the revised script JSON object (no wrapper keys). Required keys: title, hook, scenes, reasoning, cta. Optional: hashtags.',
        },
        {
          role: 'user',
          content: `Constraints:\n- Max total spoken word count: ${maxWordCount}\n- Target duration: ~${targetDuration}s\n- Keep same number of scenes\n\nOriginal JSON script:\n${JSON.stringify(llmResponse, null, 2)}`,
        },
      ],
      { temperature: 0.4, maxTokens: 1600, jsonMode: true }
    );

    llmResponse = parseLLMResponse(rewrite.content, log);
    output = buildScriptOutput(llmResponse, options, rewrite.model, rewrite.usage?.totalTokens);
  }

  output = dedupeHookFromFirstScene(output);

  const validated = ScriptOutputSchema.safeParse(output);
  if (!validated.success) {
    log.error({ errors: validated.error.errors }, 'Script output validation failed');
    throw new SchemaError('Generated script failed validation', { errors: validated.error.errors });
  }

  log.info(
    {
      wordCount: output.meta?.wordCount,
      estimatedDuration: output.meta?.estimatedDuration,
      sceneCount: output.scenes.length,
    },
    'Script generated successfully'
  );

  return validated.data;
}
