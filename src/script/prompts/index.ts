/**
 * Archetype Prompts
 * 
 * Prompt templates for each content archetype.
 */
import { Archetype } from '../../core/config';

export interface PromptContext {
  topic: string;
  targetWordCount: number;
  targetDuration: number;
}

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
- Include visual hints for each section

STRUCTURE:
1. Hook (attention-grabbing opening)
2. Brief intro (optional, set context)
3. Points (numbered, each with visual hint)
4. Conclusion/CTA

Respond with this exact JSON structure:
{
  "title": "Video title",
  "hook": "Opening hook text (first thing said)",
  "sections": [
    {"type": "hook", "text": "Hook text", "visualHint": "what to show"},
    {"type": "point", "text": "Point 1 text", "visualHint": "visual description"},
    {"type": "point", "text": "Point 2 text", "visualHint": "visual description"},
    ...
  ],
  "cta": "Call to action text"
}`;
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
- Include visual hints for each section

STRUCTURE:
1. Hook (present the choice/dilemma)
2. Comparison points (alternate or grouped)
3. Verdict/recommendation
4. CTA

Respond with this exact JSON structure:
{
  "title": "Video title",
  "hook": "Opening hook presenting the comparison",
  "sections": [
    {"type": "hook", "text": "Hook text", "visualHint": "split screen or VS graphic"},
    {"type": "point", "text": "Comparison point 1", "visualHint": "visual description"},
    {"type": "point", "text": "Comparison point 2", "visualHint": "visual description"},
    {"type": "conclusion", "text": "Verdict text", "visualHint": "winner highlight"}
  ],
  "cta": "Call to action text"
}`;
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
- Include visual hints for each step

STRUCTURE:
1. Hook (show result or problem)
2. Steps (numbered, clear instructions)
3. Quick recap or result
4. CTA

Respond with this exact JSON structure:
{
  "title": "Video title",
  "hook": "Opening hook showing result or problem",
  "sections": [
    {"type": "hook", "text": "Hook text", "visualHint": "end result or problem visual"},
    {"type": "point", "text": "Step 1", "visualHint": "step demonstration"},
    {"type": "point", "text": "Step 2", "visualHint": "step demonstration"},
    {"type": "conclusion", "text": "Result recap", "visualHint": "final result"}
  ],
  "cta": "Call to action text"
}`;
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
1. Hook (state the common misconception)
2. Myth/Reality pairs
3. Key takeaway
4. CTA

Respond with this exact JSON structure:
{
  "title": "Video title",
  "hook": "Opening hook stating misconception",
  "sections": [
    {"type": "hook", "text": "Hook text", "visualHint": "myth visual"},
    {"type": "point", "text": "Myth 1... Reality: ...", "visualHint": "contrast visual"},
    {"type": "point", "text": "Myth 2... Reality: ...", "visualHint": "contrast visual"},
    {"type": "conclusion", "text": "Key takeaway", "visualHint": "truth reveal"}
  ],
  "cta": "Call to action text"
}`;
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
1. Hook (create intrigue)
2. Setup (introduce situation)
3. Conflict/Challenge
4. Resolution/Lesson
5. CTA

Respond with this exact JSON structure:
{
  "title": "Video title",
  "hook": "Opening hook creating intrigue",
  "sections": [
    {"type": "hook", "text": "Hook text", "visualHint": "intriguing visual"},
    {"type": "intro", "text": "Setup/context", "visualHint": "scene setting"},
    {"type": "point", "text": "The challenge/conflict", "visualHint": "tension visual"},
    {"type": "conclusion", "text": "Resolution and lesson", "visualHint": "resolution visual"}
  ],
  "cta": "Call to action text"
}`;
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
1. Hook (bold statement)
2. Supporting arguments
3. Brief counterpoint acknowledgment
4. Strong conclusion
5. CTA (invite debate)

Respond with this exact JSON structure:
{
  "title": "Video title",
  "hook": "Bold opening statement",
  "sections": [
    {"type": "hook", "text": "Hook text", "visualHint": "attention-grabbing visual"},
    {"type": "point", "text": "Argument 1", "visualHint": "supporting visual"},
    {"type": "point", "text": "Argument 2", "visualHint": "supporting visual"},
    {"type": "transition", "text": "Counterpoint acknowledgment", "visualHint": "contrast"},
    {"type": "conclusion", "text": "Strong final stance", "visualHint": "confident visual"}
  ],
  "cta": "Call to action inviting comments/debate"
}`;
}
