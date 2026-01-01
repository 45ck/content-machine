/**
 * Step 2: Script Generation (Reasoning Agent)
 *
 * Uses GPT-4o to write a scene-by-scene script.
 * Each scene includes voiceover text and visual description.
 */

import { v4 as uuid } from 'uuid';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import type { ContentObject, Script } from '../types/index.js';

const ScriptOutputSchema = z.object({
  title: z.string(),
  scenes: z.array(z.object({
    number: z.number(),
    duration: z.number().describe('Duration in seconds'),
    voiceover: z.string().describe('What the narrator says'),
    visualDescription: z.string().describe('What appears on screen'),
    assetHints: z.array(z.string()).describe('Asset suggestions: "product-ui:dashboard" or "pexels:coding"'),
  })),
});

export class ScriptGenerationStep {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async execute(contentObject: ContentObject): Promise<Script> {
    console.log(`[Step 2] Generating script for: "${contentObject.hook}"...`);

    const systemPrompt = `You are a short-form video scriptwriter for tech content.

Rules:
1. First scene MUST deliver the hook immediately (1-2 seconds)
2. Each scene should be 3-10 seconds
3. Total duration should match the planned duration
4. Voiceover should be natural, conversational
5. Visual descriptions should be specific and achievable
6. Use asset hints to suggest what footage to use:
   - "product-ui:dashboard" = capture our product UI
   - "product-ui:bot-creation" = capture bot creation flow
   - "pexels:coding" = stock footage of coding
   - "pexels:gaming" = stock footage of gaming
   - "text-overlay" = text on screen

Keep the energy high and pacing fast for short-form.`;

    const userPrompt = `Create a script for this content:

Hook: ${contentObject.hook}
Target Audience: ${contentObject.targetAudience}
Style: ${contentObject.style}
Duration: ${contentObject.estimatedDuration} seconds
Call-to-Action: ${contentObject.callToAction}

Write a scene-by-scene script. Each scene needs voiceover text and visual description.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(ScriptOutputSchema, 'script'),
    });

    const output = JSON.parse(response.choices[0].message.content || '{}');

    const totalDuration = output.scenes.reduce(
      (sum: number, s: { duration: number }) => sum + s.duration,
      0
    );

    const script: Script = {
      id: uuid(),
      contentObjectId: contentObject.id,
      title: output.title,
      scenes: output.scenes,
      totalDuration,
      createdAt: new Date(),
    };

    console.log(`[Step 2] Script created:`);
    console.log(`  Title: "${script.title}"`);
    console.log(`  Scenes: ${script.scenes.length}`);
    console.log(`  Duration: ${script.totalDuration}s`);

    return script;
  }
}
