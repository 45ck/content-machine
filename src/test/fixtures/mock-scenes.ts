/**
 * Mock scenes for testing CLI commands.
 *
 * Provides consistent mock data for script generation
 * in both `cm generate` and `cm script` commands.
 *
 * @module test/fixtures/mock-scenes
 */

import type { FakeLLMProvider } from '../stubs/fake-llm.js';

export interface MockScene {
  text: string;
  visualDirection: string;
  mood: string;
}

/**
 * Creates a set of mock scenes for a given topic.
 * Used for --mock mode in CLI commands.
 */
export function createMockScenes(topic: string): MockScene[] {
  return [
    {
      text: `Here's the thing about ${topic}...`,
      visualDirection: 'Speaker on camera',
      mood: 'engaging',
    },
    {
      text: 'First, you need to know this key point.',
      visualDirection: 'B-roll of related topic',
      mood: 'informative',
    },
    {
      text: 'Second, this is what most people get wrong.',
      visualDirection: 'Text overlay with key stat',
      mood: 'surprising',
    },
    {
      text: "And finally, here's what you should actually do.",
      visualDirection: 'Action shot',
      mood: 'empowering',
    },
    {
      text: 'Follow for more tips like this!',
      visualDirection: 'End card with social handles',
      mood: 'friendly',
    },
  ];
}

/**
 * Creates a mock script response for LLM provider.
 * Queues a complete script output with scenes, metadata.
 */
export function createMockScriptResponse(topic: string) {
  const scenes = createMockScenes(topic);
  return {
    scenes,
    reasoning: 'Mock script generated for testing. Real LLM would provide creative reasoning.',
    title: `Mock: ${topic}`,
    hook: `Here's the thing about ${topic}...`,
    cta: 'Follow for more tips like this!',
    hashtags: ['#mock', '#test'],
  };
}

/**
 * Configures a FakeLLMProvider with mock script response.
 */
export function configureMockLLMProvider(provider: FakeLLMProvider, topic: string): void {
  provider.queueJsonResponse(createMockScriptResponse(topic));
}
