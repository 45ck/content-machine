/**
 * Step 1B: Planner (Reasoning Agent)
 *
 * Uses GPT-4o to select the best trend and plan content.
 * Outputs a ContentObject with hook, audience, CTA, style.
 */

import { v4 as uuid } from 'uuid';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import type { TrendItem, ContentObject } from '../types/index.js';

const PlannerOutputSchema = z.object({
  hook: z.string().describe('Attention-grabbing first line (under 100 chars)'),
  targetAudience: z.string().describe('Who this content is for'),
  callToAction: z.string().describe('What viewer should do next'),
  estimatedDuration: z.number().describe('Video length in seconds (15-90)'),
  style: z.enum(['educational', 'entertaining', 'tutorial', 'news']),
  viralityScore: z.number().min(0).max(100).describe('Predicted viral potential (advisory only)'),
  reasoning: z.string().describe('Why this approach was chosen'),
});

export class PlannerStep {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async execute(trendItem: TrendItem): Promise<ContentObject> {
    console.log(`[Step 1B] Planning content for: "${trendItem.title}"...`);

    const systemPrompt = `You are a short-form video content planner for Vibecord, a platform that helps people create Discord bots and Minecraft servers.

Your job is to take a trending topic and plan engaging short-form video content (TikTok, Reels, Shorts).

Key principles:
1. Hook in first 1-2 seconds is CRITICAL
2. Keep it 15-60 seconds for best engagement
3. Educational content performs well in tech niche
4. Always tie back to our product somehow
5. Call-to-action should feel natural, not salesy

Target audience: Discord server admins, Minecraft server owners, tech enthusiasts, ages 16-35`;

    const userPrompt = `Trending topic:
Title: ${trendItem.title}
Source: ${trendItem.source}
Score: ${trendItem.score}

Plan a short-form video for this topic. Create a compelling hook, identify the target audience, and suggest a natural call-to-action.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(PlannerOutputSchema, 'content_plan'),
    });

    const output = JSON.parse(response.choices[0].message.content || '{}');

    const contentObject: ContentObject = {
      id: uuid(),
      trendItemId: trendItem.id,
      hook: output.hook,
      targetAudience: output.targetAudience,
      callToAction: output.callToAction,
      estimatedDuration: output.estimatedDuration,
      style: output.style,
      viralityScore: output.viralityScore, // Advisory only, never a gate
      createdAt: new Date(),
    };

    console.log(`[Step 1B] Plan created:`);
    console.log(`  Hook: "${contentObject.hook}"`);
    console.log(`  Style: ${contentObject.style}`);
    console.log(`  Duration: ${contentObject.estimatedDuration}s`);

    return contentObject;
  }
}
