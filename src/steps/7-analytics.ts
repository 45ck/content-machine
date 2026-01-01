/**
 * Step 7: Analytics (Reasoning Agent)
 *
 * After human uploads and content gets views:
 * - Analyzes performance metrics
 * - Compares to expectations
 * - Suggests improvements
 * - Creates backlog items
 */

import { v4 as uuid } from 'uuid';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

export interface PerformanceMetrics {
  platform: 'tiktok' | 'reels' | 'shorts';
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimePercent: number; // Average % of video watched
  uploadedAt: Date;
  measuredAt: Date;
}

export interface AnalyticsInsights {
  id: string;
  contentObjectId: string;
  metrics: PerformanceMetrics;
  performance: 'above-expected' | 'expected' | 'below-expected';
  keyInsights: string[];
  improvements: string[];
  backlogItems: Array<{
    type: 'hook-improvement' | 'pacing-change' | 'new-template' | 'topic-pivot';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

const InsightsOutputSchema = z.object({
  performance: z.enum(['above-expected', 'expected', 'below-expected']),
  keyInsights: z.array(z.string()),
  improvements: z.array(z.string()),
  backlogItems: z.array(z.object({
    type: z.enum(['hook-improvement', 'pacing-change', 'new-template', 'topic-pivot']),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
});

export class AnalyticsStep {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async execute(
    contentObjectId: string,
    metrics: PerformanceMetrics
  ): Promise<AnalyticsInsights> {
    console.log(`[Step 7] Analyzing performance for ${contentObjectId}...`);

    const systemPrompt = `You are a short-form video performance analyst. Analyze video metrics and provide actionable insights.

Benchmarks for our niche (developer/tech tools):
- TikTok: 500+ views in 24h is good, 2000+ is great
- Watch time: 60%+ is good, 80%+ is excellent
- Engagement rate (likes+comments/views): 5%+ is good

Focus on:
1. What worked (or didn't) based on metrics
2. Specific, actionable improvements
3. Patterns to apply to future content`;

    const userPrompt = `Video performance metrics:
Platform: ${metrics.platform}
Views: ${metrics.views}
Likes: ${metrics.likes}
Comments: ${metrics.comments}
Shares: ${metrics.shares}
Avg Watch Time: ${metrics.watchTimePercent}%
Time since upload: ${this.hoursSince(metrics.uploadedAt, metrics.measuredAt)} hours

Analyze this performance and suggest improvements.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(InsightsOutputSchema, 'analytics'),
    });

    const output = JSON.parse(response.choices[0].message.content || '{}');

    const insights: AnalyticsInsights = {
      id: uuid(),
      contentObjectId,
      metrics,
      performance: output.performance,
      keyInsights: output.keyInsights,
      improvements: output.improvements,
      backlogItems: output.backlogItems,
    };

    console.log(`[Step 7] Performance: ${insights.performance}`);
    console.log(`[Step 7] Generated ${insights.backlogItems.length} backlog items`);

    return insights;
  }

  private hoursSince(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60));
  }
}
