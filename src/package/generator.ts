/**
 * Package Generator
 *
 * Generates packaging variants (title + cover text + muted hook text).
 */
import { createLLMProvider, LLMProvider } from '../core/llm';
import { loadConfig } from '../core/config';
import { createLogger } from '../core/logger';
import { SchemaError } from '../core/errors';
import {
  PACKAGE_SCHEMA_VERSION,
  PackageOutput,
  PackageOutputSchema,
  PackageVariant,
  Platform,
  PlatformEnum,
  LLMPackageResponseSchema,
} from './schema';

export interface GeneratePackageOptions {
  topic: string;
  platform?: Platform;
  variants?: number;
  llmProvider?: LLMProvider;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function scoreRange(wordCount: number, min: number, max: number): number {
  if (wordCount >= min && wordCount <= max) return 1;
  // Linear falloff outside the target band (soft penalty)
  const distance = wordCount < min ? min - wordCount : wordCount - max;
  return clamp01(1 - distance / Math.max(min, max));
}

function scoreVariant(variant: PackageVariant): {
  score: number;
  breakdown: Record<string, number>;
} {
  const titleWords = countWords(variant.title);
  const coverWords = countWords(variant.coverText);
  const hookWords = countWords(variant.onScreenHook);

  const title = scoreRange(titleWords, 6, 14);
  const coverText = scoreRange(coverWords, 2, 6);
  const onScreenHook = scoreRange(hookWords, 3, 10);

  const score = clamp01(title * 0.45 + coverText * 0.3 + onScreenHook * 0.25);
  return { score, breakdown: { title, coverText, onScreenHook } };
}

function selectBestVariant(variants: PackageVariant[]): {
  variants: PackageVariant[];
  selectedIndex: number;
} {
  const scored = variants.map((v) => {
    const { score, breakdown } = scoreVariant(v);
    return { ...v, score, scoreBreakdown: breakdown };
  });

  let bestIndex = 0;
  let bestScore = scored[0]?.score ?? 0;
  for (let i = 1; i < scored.length; i++) {
    const score = scored[i].score ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return { variants: scored, selectedIndex: bestIndex };
}

function parseLLMResponse(
  content: string,
  log: ReturnType<typeof createLogger>
): ReturnType<typeof LLMPackageResponseSchema.parse> {
  try {
    const parsed = JSON.parse(content);
    return LLMPackageResponseSchema.parse(parsed);
  } catch (error) {
    log.error({ error, content }, 'Failed to parse LLM packaging response');
    throw new SchemaError('LLM returned invalid packaging format', {
      content: content.slice(0, 500),
    });
  }
}

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

export async function generatePackage(options: GeneratePackageOptions): Promise<PackageOutput> {
  const log = createLogger({ module: 'package', topic: options.topic });
  const config = await loadConfig();

  const platform = options.platform ? PlatformEnum.parse(options.platform) : 'tiktok';
  const requestedVariants = options.variants ?? 5;
  const variantCount = Math.max(3, requestedVariants);

  const llm = options.llmProvider ?? createLLMProvider(config.llm.provider, config.llm.model);

  const prompt = `Create ${variantCount} packaging variants for a short-form video.

TOPIC: "${options.topic}"
PLATFORM: ${platform}

Rules:
- Titles must be instantly understood while scrolling (simple words, no puns).
- Cover/thumbnail text must be 2-6 words and readable on a phone.
- Include on-screen hook text that works with muted autoplay.
- Avoid misinformation, harassment, or rage-bait framing.

Respond with JSON only in this exact shape:
{
  "variants": [
    {
      "title": "Title text",
      "coverText": "Cover text (2-6 words)",
      "onScreenHook": "On-screen hook text (muted autoplay)",
      "angle": "Optional: why this is clickable"
    }
  ],
  "reasoning": "Optional: brief notes on overall strategy"
}`;

  const response = await llm.chat(
    [
      {
        role: 'system',
        content:
          'You are an expert short-form packaging strategist. You create simple, clickable titles and mobile-readable cover text. Always return valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    { temperature: config.llm.temperature ?? 0.7, maxTokens: 1200, jsonMode: true }
  );

  const llmResponse = parseLLMResponse(response.content, log);
  const rawVariants = llmResponse.variants as PackageVariant[];

  if (rawVariants.length === 0) {
    throw new SchemaError('LLM returned no packaging variants');
  }

  const { variants, selectedIndex } = selectBestVariant(rawVariants);
  const selected = variants[selectedIndex];

  const output: PackageOutput = {
    schemaVersion: PACKAGE_SCHEMA_VERSION,
    topic: options.topic,
    platform,
    variants,
    selectedIndex,
    selected,
    meta: {
      generatedAt: new Date().toISOString(),
      model: response.model,
      promptVersion: 'package-v1',
      llmCost: calculateCost(response.usage?.totalTokens ?? 0, response.model ?? llm.model),
    },
    extra: llmResponse.reasoning ? { reasoning: llmResponse.reasoning } : undefined,
  };

  const validated = PackageOutputSchema.safeParse(output);
  if (!validated.success) {
    log.error({ errors: validated.error.errors }, 'Package output validation failed');
    throw new SchemaError('Generated package failed validation', {
      issues: validated.error.errors,
    });
  }

  log.info(
    { variants: validated.data.variants.length, selectedIndex: validated.data.selectedIndex },
    'Packaging generated'
  );

  return validated.data;
}
