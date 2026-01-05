/**
 * Script Generator
 * 
 * Generates video scripts using LLM with archetype-specific prompts.
 */
import { createLLMProvider, LLMProvider } from '../core/llm';
import { loadConfig, Archetype } from '../core/config';
import { SchemaError, APIError } from '../core/errors';
import { logger, createLogger } from '../core/logger';
import { 
  ScriptOutput, 
  ScriptOutputSchema, 
  LLMScriptResponseSchema,
  ScriptSection 
} from './schema';
import { getPromptForArchetype } from './prompts';

export type { ScriptOutput, ScriptSection } from './schema';

export interface GenerateScriptOptions {
  topic: string;
  archetype: Archetype;
  targetDuration?: number;
  llmProvider?: LLMProvider;
}

/**
 * Generate a script from a topic using the specified archetype
 */
export async function generateScript(options: GenerateScriptOptions): Promise<ScriptOutput> {
  const log = createLogger({ module: 'script', topic: options.topic });
  const config = await loadConfig();
  
  // Get or create LLM provider
  const llm = options.llmProvider ?? createLLMProvider(
    config.llm.provider,
    config.llm.model
  );
  
  const targetDuration = options.targetDuration ?? 45;
  const targetWordCount = Math.round(targetDuration * 2.5); // ~150 WPM
  
  log.info({ 
    archetype: options.archetype, 
    targetDuration, 
    targetWordCount 
  }, 'Generating script');
  
  // Get archetype-specific prompt
  const prompt = getPromptForArchetype(options.archetype, {
    topic: options.topic,
    targetWordCount,
    targetDuration,
  });
  
  // Call LLM
  const response = await llm.chat([
    {
      role: 'system',
      content: `You are an expert short-form video scriptwriter. You write engaging scripts for TikTok, Reels, and YouTube Shorts. Your scripts are punchy, conversational, and optimized for viewer retention. Always respond with valid JSON.`,
    },
    {
      role: 'user',
      content: prompt,
    },
  ], {
    temperature: config.llm.temperature ?? 0.7,
    maxTokens: 2000,
    jsonMode: true,
  });
  
  // Parse and validate LLM response
  let llmResponse;
  try {
    const parsed = JSON.parse(response.content);
    llmResponse = LLMScriptResponseSchema.parse(parsed);
  } catch (error) {
    log.error({ error, content: response.content }, 'Failed to parse LLM response');
    throw new SchemaError(
      'LLM returned invalid script format',
      { content: response.content.slice(0, 500) }
    );
  }
  
  // Transform to full ScriptOutput
  const sections: ScriptSection[] = llmResponse.sections.map((section, index) => ({
    id: `section-${index}`,
    type: section.type,
    text: section.text,
    visualHint: section.visualHint,
    order: index,
  }));
  
  // Calculate word count
  const allText = [llmResponse.hook, ...sections.map(s => s.text), llmResponse.cta].filter(Boolean).join(' ');
  const wordCount = allText.split(/\s+/).filter(Boolean).length;
  const estimatedDuration = wordCount / 2.5; // ~150 WPM
  
  const output: ScriptOutput = {
    title: llmResponse.title,
    hook: llmResponse.hook,
    sections,
    cta: llmResponse.cta,
    metadata: {
      wordCount,
      estimatedDuration,
      archetype: options.archetype,
      topic: options.topic,
      generatedAt: new Date().toISOString(),
      llmModel: response.model,
      llmCost: calculateCost(response.usage?.totalTokens ?? 0, response.model ?? 'gpt-4o'),
    },
  };
  
  // Validate final output
  const validated = ScriptOutputSchema.safeParse(output);
  if (!validated.success) {
    log.error({ errors: validated.error.errors }, 'Script output validation failed');
    throw new SchemaError(
      'Generated script failed validation',
      { errors: validated.error.errors }
    );
  }
  
  log.info({ 
    wordCount, 
    estimatedDuration, 
    sectionCount: sections.length 
  }, 'Script generated successfully');
  
  return validated.data;
}

/**
 * Calculate approximate LLM cost
 */
function calculateCost(tokens: number, model: string): number {
  // Approximate costs per 1M tokens
  const costs: Record<string, number> = {
    'gpt-4o': 5, // $5 per 1M tokens (blended)
    'gpt-4o-mini': 0.15,
    'gpt-3.5-turbo': 0.5,
    'claude-3-5-sonnet-20241022': 3,
    'claude-3-haiku-20240307': 0.25,
  };
  
  const costPer1M = costs[model] ?? 5;
  return (tokens / 1_000_000) * costPer1M;
}
