import 'dotenv/config';
import { OpenAIProvider } from '../src/core/llm/openai';
import { ContentAngleSchema } from '../src/research/schema';

async function main() {
  const provider = new OpenAIProvider('gpt-4o-mini', process.env.OPENAI_API_KEY);
  console.log('Provider created:', provider.name);

  const ANGLE_GENERATION_PROMPT = `You are a content strategist for short-form video (TikTok, Reels, Shorts).
Based on the research evidence provided, generate content angles that would perform well.

For each angle, provide:
- angle: A clear description of the content angle
- hook: An attention-grabbing opening line (under 10 words)
- archetype: One of: listicle, versus, howto, myth, story, hot-take
- targetEmotion: The primary emotion to evoke (curiosity, surprise, fear, excitement, etc.)
- confidence: Your confidence score 0-1 based on evidence strength

Return a JSON array of content angles. Focus on angles with strong evidence support.`;

  const response = await provider.chat(
    [
      { role: 'system', content: ANGLE_GENERATION_PROMPT },
      {
        role: 'user',
        content: `Research query: "TypeScript tips 2025"

Evidence found:
1. [tavily] TypeScript Best Practices 2025
   Tips for better TypeScript code including strict mode, generics, and type guards.

2. [tavily] 10 TypeScript Features You Might Not Know
   Hidden gems in TypeScript that can improve your productivity.

Generate 3 content angles as a JSON array.`,
      },
    ],
    { jsonMode: true, temperature: 0.7 }
  );

  console.log('Raw response:', response.content);

  const parsed = JSON.parse(response.content);
  console.log('Parsed:', JSON.stringify(parsed, null, 2));

  const angles = Array.isArray(parsed) ? parsed : (parsed.angles ?? []);
  for (const angle of angles) {
    const result = ContentAngleSchema.safeParse(angle);
    if (result.success) {
      console.log('✅ Valid:', result.data.hook);
    } else {
      console.log('❌ Invalid:', result.error.issues);
    }
  }
}

main().catch(console.error);
