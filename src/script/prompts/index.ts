/**
 * Archetype Prompts
 *
 * Prompt templates for each content archetype.
 * Based on SYSTEM-DESIGN §6.3 GeneratedScriptSchema
 */
import { Archetype } from '../../core/config';

export interface PromptContext {
  topic: string;
  targetWordCount: number;
  targetDuration: number;
}

// Common JSON output format for all archetypes
const JSON_OUTPUT_FORMAT = `
Respond with this exact JSON structure:
{
  "scenes": [
    {"text": "Scene 1 spoken text", "visualDirection": "what to show visually", "mood": "emotional tone"},
    {"text": "Scene 2 spoken text", "visualDirection": "visual description", "mood": "tone"},
    ...
  ],
  "reasoning": "Explain your creative choices: why this structure, hook strategy, pacing decisions",
  "title": "Video title (optional)",
  "hook": "First sentence that grabs attention (optional)",
  "cta": "Call to action (optional)",
  "hashtags": ["#tag1", "#tag2"]
}`;

/**
 * Get the prompt for a specific archetype
 */
export function getPromptForArchetype(archetype: Archetype, context: PromptContext): string {
  const prompts: Record<Archetype, string> = {
    listicle: getListiclePrompt(context),
    versus: getVersusPrompt(context),
    howto: getHowToPrompt(context),
    myth: getMythPrompt(context),
    story: getStoryPrompt(context),
    'hot-take': getHotTakePrompt(context),
  };

  return prompts[archetype];
}

function getListiclePrompt(context: PromptContext): string {
  return `Create a short-form video script about: "${context.topic}"

FORMAT: Listicle (numbered list of tips/facts/items)

REQUIREMENTS:
- Target length: ~${context.targetWordCount} words (~${context.targetDuration} seconds when spoken)
- Start with a compelling hook that creates curiosity (first 3 seconds are critical)
- Include 3-5 numbered points
- Each point should be concise and actionable
- End with a call-to-action (follow, like, comment)
- Use conversational, TikTok-style language

STRUCTURE:
1. Scene 1: Hook (attention-grabbing opening)
2. Scene 2-5: Points (numbered, each with visual direction)
3. Final Scene: Conclusion/CTA
${JSON_OUTPUT_FORMAT}`;
}

function getVersusPrompt(context: PromptContext): string {
  return `Create a short-form video script comparing: "${context.topic}"

FORMAT: Versus/Comparison (X vs Y analysis)

REQUIREMENTS:
- Target length: ~${context.targetWordCount} words (~${context.targetDuration} seconds when spoken)
- Start with a hook that presents the dilemma
- Compare 3-4 key aspects fairly
- Give a clear recommendation at the end
- Use conversational, TikTok-style language

STRUCTURE:
1. Scene 1: Hook (present the choice/dilemma)
2. Scene 2-4: Comparison points
3. Scene 5: Verdict/recommendation
${JSON_OUTPUT_FORMAT}`;
}

function getHowToPrompt(context: PromptContext): string {
  return `Create a short-form video script teaching: "${context.topic}"

FORMAT: How-To/Tutorial (step-by-step guide)

REQUIREMENTS:
- Target length: ~${context.targetWordCount} words (~${context.targetDuration} seconds when spoken)
- Start with a hook showing the end result or problem
- Break into 3-5 clear steps
- Each step should be actionable and specific
- Use conversational, TikTok-style language

STRUCTURE:
1. Scene 1: Hook (show result or problem)
2. Scene 2-5: Steps (numbered, clear instructions)
3. Final Scene: Quick recap or result
${JSON_OUTPUT_FORMAT}`;
}

function getMythPrompt(context: PromptContext): string {
  return `Create a short-form video script debunking: "${context.topic}"

FORMAT: Myth-Busting (Myth vs Reality)

REQUIREMENTS:
- Target length: ~${context.targetWordCount} words (~${context.targetDuration} seconds when spoken)
- Start with a provocative hook stating the common belief
- Present 2-3 myths and their realities
- Use "You probably think X, but actually Y" pattern
- End with the key takeaway
- Use conversational, TikTok-style language

STRUCTURE:
1. Scene 1: Hook (state the common misconception)
2. Scene 2-4: Myth/Reality pairs
3. Final Scene: Key takeaway
${JSON_OUTPUT_FORMAT}`;
}

function getStoryPrompt(context: PromptContext): string {
  return `Create a short-form video script telling a story about: "${context.topic}"

FORMAT: Story/Narrative (engaging story arc)

REQUIREMENTS:
- Target length: ~${context.targetWordCount} words (~${context.targetDuration} seconds when spoken)
- Start with a hook that creates intrigue
- Follow: Setup → Conflict → Resolution structure
- Make it relatable and emotional
- End with a lesson or insight
- Use conversational, TikTok-style language

STRUCTURE:
1. Scene 1: Hook (create intrigue)
2. Scene 2: Setup (introduce situation)
3. Scene 3: Conflict/Challenge
4. Scene 4: Resolution/Lesson
${JSON_OUTPUT_FORMAT}`;
}

function getHotTakePrompt(context: PromptContext): string {
  return `Create a short-form video script with a hot take on: "${context.topic}"

FORMAT: Hot Take/Opinion (provocative viewpoint)

REQUIREMENTS:
- Target length: ~${context.targetWordCount} words (~${context.targetDuration} seconds when spoken)
- Start with a controversial or surprising statement
- Back up with 2-3 strong arguments
- Acknowledge the other side briefly
- End confidently with your stance
- Use conversational, TikTok-style language
- Be bold but not offensive

STRUCTURE:
1. Scene 1: Hook (bold statement)
2. Scene 2-3: Supporting arguments
3. Scene 4: Brief counterpoint acknowledgment
4. Scene 5: Strong conclusion
${JSON_OUTPUT_FORMAT}`;
}
