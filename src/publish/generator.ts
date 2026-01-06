/**
 * Publish Generator
 *
 * Generates platform metadata + a QA checklist for upload.
 * Default mode is deterministic; LLM mode is opt-in.
 */
import { createLLMProvider, type LLMProvider } from '../core/llm';
import { loadConfig } from '../core/config';
import { createLogger } from '../core/logger';
import { SchemaError } from '../core/errors';
import type { Platform, PackageOutput } from '../package/schema';
import type { ScriptOutput } from '../script/schema';
import {
  LLMPublishResponseSchema,
  PublishOutput,
  PublishOutputSchema,
  PUBLISH_SCHEMA_VERSION,
} from './schema';

export interface GeneratePublishOptions {
  platform?: Platform;
  script: ScriptOutput;
  packaging?: PackageOutput;
  mode?: 'deterministic' | 'llm';
  llmProvider?: LLMProvider;
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

function defaultChecklist(): PublishOutput['checklist'] {
  return [
    { id: 'render-quality', label: 'Video passes cm validate (resolution/format)', required: true },
    { id: 'captions', label: 'Captions are readable on a phone', required: true },
    { id: 'cover-text', label: 'Cover text is 2-6 words and legible', required: true },
    { id: 'hook', label: 'First 2 seconds match the hook promise', required: true },
    { id: 'hashtag-sanity', label: 'Hashtags are relevant (no spam)', required: false },
  ];
}

export function generatePublishDeterministic(options: GeneratePublishOptions): PublishOutput {
  const title = options.script.title ?? options.packaging?.selected.title ?? 'Untitled';
  const coverText = options.packaging?.selected.coverText;
  const hashtags = options.script.hashtags ?? [];
  const hook = options.script.hook ?? options.script.scenes[0]?.text ?? '';
  const cta = options.script.cta ?? 'Follow for more.';

  const description = `${title}\n\n${hook}\n\n${cta}`.trim();

  return {
    schemaVersion: PUBLISH_SCHEMA_VERSION,
    platform: options.platform ?? 'tiktok',
    title,
    coverText,
    hashtags,
    description,
    checklist: defaultChecklist(),
    createdAt: new Date().toISOString(),
  };
}

function parseLLMResponse(
  content: string,
  log: ReturnType<typeof createLogger>
): ReturnType<typeof LLMPublishResponseSchema.parse> {
  try {
    return LLMPublishResponseSchema.parse(JSON.parse(content));
  } catch (error) {
    log.error({ error, content }, 'Failed to parse LLM publish response');
    throw new SchemaError('LLM returned invalid publish format', {
      content: content.slice(0, 500),
    });
  }
}

function buildPublishPrompt(params: {
  platform: string;
  title: string;
  hook: string;
  cta: string;
}): string {
  return `Generate upload metadata for a short-form video.

PLATFORM: ${params.platform}
TITLE: ${JSON.stringify(params.title)}
HOOK: ${JSON.stringify(params.hook)}
CTA: ${JSON.stringify(params.cta)}

Rules:
- Be concise and scroll-stopping.
- Avoid misinformation, harassment, and rage-bait framing.
- Prefer 5-12 relevant hashtags.
- Include a small upload checklist.

Return JSON only in this shape:
{
  "description": "string",
  "hashtags": ["#tag"],
  "checklist": [{"id":"render-quality","label":"...","required":true}]
}`;
}

function mergeChecklist(
  parsed: ReturnType<typeof LLMPublishResponseSchema.parse>,
  fallback: PublishOutput['checklist']
): PublishOutput['checklist'] {
  if (!parsed.checklist?.length) return fallback;
  return parsed.checklist.map((c) => ({ id: c.id, label: c.label, required: c.required ?? true }));
}

async function generatePublishWithLLM(options: GeneratePublishOptions): Promise<PublishOutput> {
  const log = createLogger({ module: 'publish' });
  const config = await loadConfig();
  const llm = options.llmProvider ?? createLLMProvider(config.llm.provider, config.llm.model);

  const base = generatePublishDeterministic(options);
  const title = base.title;
  const hook = options.script.hook ?? options.script.scenes[0]?.text ?? '';
  const platform = options.platform ?? 'tiktok';

  const prompt = buildPublishPrompt({
    platform,
    title,
    hook,
    cta: options.script.cta ?? '',
  });

  const response = await llm.chat(
    [
      {
        role: 'system',
        content:
          'You are an expert short-form publishing assistant. Always return valid JSON only.',
      },
      { role: 'user', content: prompt },
    ],
    { temperature: config.llm.temperature ?? 0.7, maxTokens: 600, jsonMode: true }
  );

  const parsed = parseLLMResponse(response.content, log);
  const output: PublishOutput = {
    ...base,
    description: parsed.description ?? base.description,
    hashtags: parsed.hashtags ?? base.hashtags,
    checklist: mergeChecklist(parsed, base.checklist),
    meta: {
      model: response.model,
      promptVersion: 'publish-v1',
      llmCost: calculateCost(response.usage?.totalTokens ?? 0, response.model ?? llm.model),
    },
  };

  const validated = PublishOutputSchema.safeParse(output);
  if (!validated.success) {
    throw new SchemaError('Generated publish output failed validation', {
      issues: validated.error.errors,
    });
  }

  return validated.data;
}

export async function generatePublish(options: GeneratePublishOptions): Promise<PublishOutput> {
  const mode = options.mode ?? 'deterministic';
  if (mode === 'llm') return generatePublishWithLLM(options);

  const base = generatePublishDeterministic(options);
  const validated = PublishOutputSchema.safeParse(base);
  if (!validated.success) {
    throw new SchemaError('Deterministic publish output failed validation', {
      issues: validated.error.errors,
    });
  }
  return validated.data;
}
