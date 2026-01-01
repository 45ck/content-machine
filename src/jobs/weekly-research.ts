/**
 * Weekly Deep Research Job
 *
 * This is a heavy, expensive job that runs weekly (not daily).
 * It performs deep research using the OpenAI Agent SDK to:
 *
 * 1. Analyze platform algorithm changes
 * 2. Identify emerging trends in our niche
 * 3. Study competitor content strategies
 * 4. Generate topic ideas for the week
 * 5. Update our content calendar
 *
 * Cost: ~$0.50-2.00 per run (vs $0.05 for daily planner)
 * Frequency: Once per week (Sunday night)
 */

import { v4 as uuid } from 'uuid';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// Weekly research output schema
const WeeklyResearchOutputSchema = z.object({
  weekStarting: z.string(), // ISO date

  algorithmInsights: z.array(z.object({
    platform: z.enum(['tiktok', 'youtube_shorts', 'instagram_reels']),
    insight: z.string(),
    source: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
  })),

  emergingTrends: z.array(z.object({
    topic: z.string(),
    description: z.string(),
    relevanceToUs: z.enum(['high', 'medium', 'low']),
    suggestedAngle: z.string(),
    peakWindow: z.string(), // e.g., "next 3-5 days"
  })),

  competitorAnalysis: z.array(z.object({
    competitor: z.string(),
    recentWin: z.string(),
    whatWorked: z.string(),
    canWeAdapt: z.boolean(),
    adaptationIdea: z.string().nullable(),
  })),

  weeklyTopics: z.array(z.object({
    day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    topic: z.string(),
    hook: z.string(),
    targetPlatform: z.enum(['tiktok', 'reels', 'shorts', 'all']),
    priority: z.enum(['must-do', 'stretch', 'backlog']),
  })),

  strategicNotes: z.string(),
});

export type WeeklyResearchOutput = z.infer<typeof WeeklyResearchOutputSchema>;

export interface DeepResearchResult {
  id: string;
  createdAt: Date;
  research: WeeklyResearchOutput;
  tokensUsed: number;
  costEstimate: number;
}

export class WeeklyDeepResearch {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async execute(): Promise<DeepResearchResult> {
    const weekStarting = this.getNextMonday();
    console.log(`[Weekly Research] Starting deep research for week of ${weekStarting}...`);

    const systemPrompt = `You are a short-form video content strategist for Vibecord, a platform that helps people create Discord bots and Minecraft servers.

Your job is to do deep weekly research to inform our content calendar. Analyze:

1. Platform algorithm changes - What's working now on TikTok, Reels, Shorts?
2. Emerging trends - What topics are gaining traction in tech/dev/gaming?
3. Competitor content - What's working for similar brands?
4. Weekly calendar - Suggest specific topics for each day

Our target audience:
- Discord server admins wanting custom bots
- Minecraft server owners
- Tech enthusiasts, developers, gamers
- Ages 16-35, primarily male

Content style:
- Educational but entertaining
- Hook-driven (first 1-2 seconds critical)
- 15-60 seconds optimal
- Show don't tell (screen recordings, demos)

Focus on topics we can tie back to Vibecord/Vibeforge product.`;

    const userPrompt = `Today is ${new Date().toISOString().split('T')[0]}.
Please perform deep research for the week starting ${weekStarting}.

Consider:
- Current viral trends on TikTok/Reels/Shorts
- Any platform algorithm updates
- Competitor content that performed well
- Upcoming events, holidays, or cultural moments we can tie into
- Topics that naturally showcase our Discord bot or Minecraft features

Generate a complete weekly content calendar with specific, actionable topics.`;

    const startTime = Date.now();

    // In production, this would use multiple tool calls and web searches
    // For now, we do a single expensive GPT-4o call
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(WeeklyResearchOutputSchema, 'weekly_research'),
      max_tokens: 4000, // Allow longer response for comprehensive research
    });

    const elapsed = Date.now() - startTime;
    console.log(`[Weekly Research] Completed in ${elapsed}ms`);

    const output = JSON.parse(response.choices[0].message.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    // Rough cost estimate: $0.01 per 1K tokens for GPT-4o
    const costEstimate = (tokensUsed / 1000) * 0.01;

    const result: DeepResearchResult = {
      id: uuid(),
      createdAt: new Date(),
      research: {
        ...output,
        weekStarting,
      },
      tokensUsed,
      costEstimate,
    };

    console.log(`[Weekly Research] Generated:`);
    console.log(`  - ${result.research.algorithmInsights.length} algorithm insights`);
    console.log(`  - ${result.research.emergingTrends.length} emerging trends`);
    console.log(`  - ${result.research.competitorAnalysis.length} competitor analyses`);
    console.log(`  - ${result.research.weeklyTopics.length} weekly topics`);
    console.log(`  - Cost: ~$${costEstimate.toFixed(4)}`);

    return result;
  }

  /**
   * Get the ISO date of the next Monday
   */
  private getNextMonday(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  }
}

/**
 * Scheduled job runner (called by cron or task scheduler)
 */
export async function runWeeklyResearch(): Promise<DeepResearchResult> {
  const researcher = new WeeklyDeepResearch();
  const result = await researcher.execute();

  // TODO: Save to database
  // TODO: Generate Slack/Discord notification with summary
  // TODO: Pre-populate review queue with suggested topics

  return result;
}
