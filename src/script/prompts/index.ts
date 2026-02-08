/**
 * Archetype Prompts (data-driven)
 *
 * Archetype definitions live outside `src/` as data files (builtin + user + project).
 * This module loads an archetype spec and renders its prompt fragment with variables.
 */
import Mustache from 'mustache';
import type { Archetype } from '../../core/config';
import { loadBaselineRules, resolveArchetype } from '../../archetypes/registry';

export interface PromptContext {
  topic: string;
  targetWordCount: number;
  targetDuration: number;
  packaging?: {
    title: string;
    coverText: string;
    onScreenHook: string;
  };
}

export interface ArchetypePromptResult {
  archetypeId: string;
  prompt: string;
  systemPrompt?: string;
  baselinePath?: string;
  archetypePath?: string;
}

const DEFAULT_SYSTEM_PROMPT =
  'You are an expert short-form video scriptwriter. You write engaging scripts for TikTok, Reels, and YouTube Shorts. Your scripts are punchy, conversational, and optimized for viewer retention. Always respond with valid JSON.';

const OUTPUT_RULES = `
OUTPUT RULES:
- Respond with JSON only. No markdown, no code fences, no commentary.
- Spoken text fields (hook, scenes[].text, cta) must be plain text: no emojis, no markdown, no hashtags, no bullet formatting.
- Hook must be ONE sentence and must NOT be repeated in scene 1.
- Scene 1 must continue after the hook with NEW information (no restating or paraphrasing the hook).
- Do not copy the hook sentence into any scene text.
- Always include hook and cta fields in the JSON.
- Each scene text must be at least 12 words.
- Hook must be a statement (no question mark).
- visualDirection must describe concrete, filmable visuals (avoid abstract phrases like "technology" or "success").
`.trim();

const JSON_OUTPUT_FORMAT = `
${OUTPUT_RULES}
Respond with this exact JSON structure:
{
  "scenes": [
    {"text": "Scene 1 spoken text (continues after the hook)", "visualDirection": "what to show visually", "mood": "emotional tone"},
    {"text": "Scene 2 spoken text", "visualDirection": "visual description", "mood": "tone"},
    ...
  ],
  "reasoning": "Explain your creative choices: why this structure, hook strategy, pacing decisions",
  "title": "Video title (optional)",
  "hook": "First sentence that grabs attention (optional)",
  "cta": "Call to action (optional)",
  "hashtags": ["#tag1", "#tag2"]
}`.trim();

function stripLeadingMarkdownHeading(text: string): string {
  const trimmed = text.trim();
  const lines = trimmed.split('\n');
  if (lines.length === 0) return '';
  if (/^#{1,6}\\s+/.test(lines[0] ?? '')) return lines.slice(1).join('\n').trim();
  return trimmed;
}

function packagingBlock(context: PromptContext): string {
  if (!context.packaging) return '';
  return `
PACKAGING (must follow):
- Title MUST be exactly: "${context.packaging.title}"
- Cover text (mobile-readable): "${context.packaging.coverText}"
- Muted autoplay on-screen hook text: "${context.packaging.onScreenHook}"
- Make the first spoken line align with the on-screen hook (same promise, same topic)
- Do not repeat the on-screen hook inside scene 1 if it matches the spoken hook
- No emojis or markdown in packaging or spoken text
`.trim();
}

function ttsWritingGuidelines(context: PromptContext): string {
  const minWordCount = Math.max(60, Math.round(context.targetWordCount * 0.8));
  const maxWordCount = Math.max(minWordCount + 20, Math.round(context.targetWordCount * 1.25));
  const isShort = context.targetDuration <= 40;
  const sceneGuidance = isShort
    ? 'Each scene should be 1-2 short sentences and ~14-22 words (minimum 12 words per scene).'
    : 'Each scene should be 1-2 sentences and ~18-28 words (minimum 12 words per scene).';
  return `
TTS WRITING RULES:
- Write for spoken delivery at 120-180 WPM.
- Target length: ~${context.targetWordCount} words (~${context.targetDuration} seconds).
- Total spoken word count must be between ${minWordCount}-${maxWordCount}. If below, add another sentence to each scene and expand the CTA. If above, trim.
- Use short sentences (<=15 words) and one idea per sentence.
- ${sceneGuidance}
- Use contractions and second person ("you", "you'll").
- Use punctuation for timing (commas = micro-pause, periods = full beat).
- Normalize text for speech: expand numbers, acronyms, URLs, emails, file paths, and units into words.
- Avoid emojis, markdown, hashtags, and bullet formatting in spoken text.
- Avoid openers like "In this video" or "Today we're going to".
- Hook is a single sentence and must not be repeated in scene 1.
- Double-check total word count before responding.
- CHECKLIST (must pass before responding): total words in range, every scene >= 12 words, hook is a statement.
	`.trim();
}

/**
 * Render the full LLM prompt for a given archetype (baseline rules + archetype fragment + output format).
 */
export async function getPromptForArchetype(
  archetype: Archetype,
  context: PromptContext
): Promise<ArchetypePromptResult> {
  const resolved = await resolveArchetype(String(archetype));
  const baseline = loadBaselineRules();
  const baselineBody = stripLeadingMarkdownHeading(baseline.content);
  const baselineBlock = baselineBody
    ? `BASELINE RULES (apply to every archetype):\\n${baselineBody}`.trim()
    : '';

  const fragment = Mustache.render(resolved.archetype.script.template, {
    topic: context.topic,
    targetDuration: context.targetDuration,
    targetWordCount: context.targetWordCount,
    packaging: context.packaging ?? null,
  }).trim();

  const blocks = [
    baselineBlock,
    fragment,
    ttsWritingGuidelines(context),
    packagingBlock(context),
    JSON_OUTPUT_FORMAT,
  ].filter(Boolean);

  return {
    archetypeId: resolved.archetype.id,
    prompt: blocks.join('\\n\\n'),
    systemPrompt: resolved.archetype.script.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    baselinePath: baseline.path,
    archetypePath: resolved.archetypePath,
  };
}
