/**
 * Script Generator
 *
 * Generates video scripts using LLM with archetype-specific prompts.
 * Based on SYSTEM-DESIGN §7.1 cm script command.
 */
import { createLLMProvider, LLMProvider } from '../core/llm';
import { loadConfig, Archetype } from '../core/config';
import { SchemaError } from '../core/errors';
import { createLogger } from '../core/logger';
import {
  ScriptOutput,
  ScriptOutputSchema,
  LLMScriptResponseSchema,
  Scene,
  SCRIPT_SCHEMA_VERSION,
} from './schema';
import { getPromptForArchetype } from './prompts';
import { buildResearchContext, extractSourceUrls } from './research-context';
import type { ResearchOutput } from '../research/schema';

export type { ScriptOutput, Scene } from './schema';
// Re-export deprecated type for backward compatibility
export type { ScriptSection } from './schema';

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
    text: scene.text,
    visualDirection: scene.visualDirection,
    mood: scene.mood,
  }));

  const allText = [llmResponse.hook, ...scenes.map((s) => s.text), llmResponse.cta]
    .filter(Boolean)
    .join(' ');
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
    hook: llmResponse.hook,
    cta: llmResponse.cta,
    hashtags: llmResponse.hashtags,
    meta: {
      wordCount,
      estimatedDuration,
      archetype: options.archetype,
      topic: options.topic,
      generatedAt: new Date().toISOString(),
      model: responseModel,
      llmCost: calculateCost(totalTokens ?? 0, responseModel ?? 'gpt-4o'),
    },
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

/**
 * Calculate approximate LLM cost
 */
function calculateCost(tokens: number, model: string): number {
  const costs: Record<string, number> = {
    'gpt-4o': 5,
    'gpt-4o-mini': 0.15,
    'gpt-3.5-turbo': 0.5,
    'claude-3-5-sonnet-20241022': 3,
    'claude-3-haiku-20240307': 0.25,
  };
  const costPer1M = costs[model] ?? 5;
  return (tokens / 1_000_000) * costPer1M;
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

  const llmResponse = parseLLMResponse(response.content, log);
  const output = buildScriptOutput(
    llmResponse,
    options,
    response.model,
    response.usage?.totalTokens
  );

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
