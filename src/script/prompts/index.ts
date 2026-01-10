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
  packaging?: {
    title: string;
    coverText: string;
    onScreenHook: string;
  };
}

const OUTPUT_RULES = `
OUTPUT RULES:
- Respond with JSON only. No markdown, no code fences, no commentary.
- Spoken text fields (hook, scenes[].text, cta) must be plain text: no emojis, no markdown, no hashtags, no bullet formatting.
- Hook must be ONE sentence and must NOT be repeated in scene 1.
- Scene 1 must continue after the hook with NEW information (no restating or paraphrasing the hook).
- Do not copy the hook sentence into any scene text.
- Always include hook and cta fields in the JSON.
- Each scene text must be at least 20 words.
- Hook must be a statement (no question mark).
`;

// Common JSON output format for all archetypes
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
`;
}

function ttsWritingGuidelines(context: PromptContext): string {
  const minWordCount = Math.max(60, Math.round(context.targetWordCount * 0.8));
  const maxWordCount = Math.max(minWordCount + 20, Math.round(context.targetWordCount * 1.25));
  return `
TTS WRITING RULES:
- Write for spoken delivery at 120-180 WPM.
- Target length: ~${context.targetWordCount} words (~${context.targetDuration} seconds).
- Total spoken word count must be between ${minWordCount}-${maxWordCount}. If below, add another sentence to each scene and expand the CTA. If above, trim.
- Use short sentences (<=15 words) and one idea per sentence.
- Each scene should be 2 sentences and ~22-30 words (minimum 20 words per scene).
- Use contractions and second person ("you", "you'll").
- Use punctuation for timing (commas = micro-pause, periods = full beat).
- Normalize text for speech: expand numbers, acronyms, URLs, emails, file paths, and units into words.
- Avoid emojis, markdown, hashtags, and bullet formatting in spoken text.
- Avoid openers like "In this video" or "Today we're going to".
- Hook is a single sentence and must not be repeated in scene 1.
- Double-check total word count before responding.
- CHECKLIST (must pass before responding): total words in range, every scene >= 20 words, hook is a statement.
`;
}

function getListiclePrompt(context: PromptContext): string {
  return `Create a short-form video script about: "${context.topic}"

FORMAT: Listicle (numbered list of tips/facts/items)

REQUIREMENTS:
- Start with a compelling hook that creates curiosity (first 3 seconds are critical)
- Include 4-5 numbered points
- Each point should be two sentences: the tip plus a quick payoff or why
- Prefix each point with an explicit number label (e.g., "Tip 1:", "2)", "Number 3:").
- End with a call-to-action (follow, like, comment)
- Use conversational, TikTok-style language
${ttsWritingGuidelines(context)}
${packagingBlock(context)}

STRUCTURE:
1. Hook field: One sentence hook (separate from scenes)
2. Scene 1: Immediate payoff after the hook (no hook repetition)
3. Scene 2-6: Points (4-5 numbered items, each with visual direction)
4. Final Scene: Conclusion/CTA
${JSON_OUTPUT_FORMAT}`;
}

function getVersusPrompt(context: PromptContext): string {
  return `Create a short-form video script comparing: "${context.topic}"

FORMAT: Versus/Comparison (X vs Y analysis)

REQUIREMENTS:
- Start with a hook that presents the dilemma (provocative or contrarian).
- Example hook tones: "Stop using X for Y", "You're using the wrong tool", "Most people get this wrong".
- The hook should be a bold statement, not a question.
- Avoid neutral hooks like "Choosing between X and Y" or "X vs Y".
- Compare 3-4 key aspects fairly
- Give a clear recommendation at the end
- Use conversational, TikTok-style language
${ttsWritingGuidelines(context)}
${packagingBlock(context)}

STRUCTURE:
1. Hook field: One sentence hook (separate from scenes)
2. Scene 1: Immediate payoff after the hook (state the stakes)
3. Scene 2-4: Comparison points
4. Scene 5: Verdict/recommendation
${JSON_OUTPUT_FORMAT}`;
}

function getHowToPrompt(context: PromptContext): string {
  return `Create a short-form video script teaching: "${context.topic}"

FORMAT: How-To/Tutorial (step-by-step guide)

REQUIREMENTS:
- Start with a hook showing the end result or problem
- Break into 4-5 clear steps
- Each step should be two sentences: the action plus a quick result/why
- Use conversational, TikTok-style language
${ttsWritingGuidelines(context)}
${packagingBlock(context)}

STRUCTURE:
1. Hook field: One sentence hook (separate from scenes)
2. Scene 1: Immediate payoff after the hook (show result or problem)
3. Scene 2-6: Steps (4-5 numbered, clear instructions)
4. Final Scene: Quick recap or result
${JSON_OUTPUT_FORMAT}`;
}

function getMythPrompt(context: PromptContext): string {
  return `Create a short-form video script debunking: "${context.topic}"

FORMAT: Myth-Busting (Myth vs Reality)

REQUIREMENTS:
- Start with a provocative hook stating the common belief
- Present 2-3 myths and their realities
- Use explicit "Myth: X" and "Reality: Y" phrasing in scene text
- Hook should be a provocative tease (NOT "Myth: ..."); reserve Myth/Reality phrasing for scene text.
- End with the key takeaway
- Use conversational, TikTok-style language
${ttsWritingGuidelines(context)}
${packagingBlock(context)}

STRUCTURE:
1. Hook field: One sentence hook (separate from scenes)
2. Scene 1: Immediate payoff after the hook (state the misconception)
3. Scene 2-4: Myth/Reality pairs
4. Final Scene: Key takeaway
${JSON_OUTPUT_FORMAT}`;
}

function getStoryPrompt(context: PromptContext): string {
  return `Create a short-form video script telling a story about: "${context.topic}"

FORMAT: Story/Narrative (engaging story arc)

REQUIREMENTS:
- Start with a hook that creates intrigue
- Follow: Setup -> Conflict -> Resolution structure
- Make it relatable and emotional
- End with a lesson or insight
- Hook should be a teaser line that is not repeated in scene 1.
- Use conversational, TikTok-style language
${ttsWritingGuidelines(context)}
${packagingBlock(context)}

STRUCTURE:
1. Hook field: One sentence hook (separate from scenes)
2. Scene 1: Setup (continues after the hook)
3. Scene 2: Conflict/Challenge
4. Scene 3: Resolution/Lesson
${JSON_OUTPUT_FORMAT}`;
}

function getHotTakePrompt(context: PromptContext): string {
  return `Create a short-form video script with a hot take on: "${context.topic}"

FORMAT: Hot Take/Opinion (provocative viewpoint)

REQUIREMENTS:
- Start with a controversial or surprising statement
- The hook should be a bold statement, not a question
- Back up with 2-3 strong arguments
- Acknowledge the other side briefly
- End confidently with your stance
- Use conversational, TikTok-style language
- Be bold but not offensive
${ttsWritingGuidelines(context)}
${packagingBlock(context)}

STRUCTURE:
1. Hook field: One sentence hook (separate from scenes)
2. Scene 1: Immediate payoff after the hook (first supporting point)
3. Scene 2-3: Supporting arguments
4. Scene 4: Brief counterpoint acknowledgment
5. Scene 5: Strong conclusion
${JSON_OUTPUT_FORMAT}`;
}
