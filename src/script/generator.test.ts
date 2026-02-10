/**
 * Script Generator Tests
 * Updated for SYSTEM-DESIGN §6.3 GeneratedScriptSchema
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMScriptResponseSchema, SCRIPT_SCHEMA_VERSION, ScriptOutputSchema } from '../domain';
import { FakeLLMProvider } from '../test/stubs';
import { ArchetypeIdSchema } from '../domain/ids';

// Mock archetype registry (avoid filesystem reads in unit tests)
vi.mock('../archetypes/registry', async () => {
  return {
    resolveArchetype: vi.fn(async (spec: string) => {
      const id = String(spec);
      return {
        archetype: {
          id,
          name: id,
          version: 1,
          script: { template: 'Create a short-form video script about: "{{topic}}"' },
        },
        spec: id,
        source: 'builtin',
        archetypePath: `/fake/${id}.yaml`,
      };
    }),
    loadBaselineRules: vi.fn(() => ({ content: '', path: undefined })),
  };
});

// Mock config module before other imports
vi.mock('../core/config', async () => {
  const { z } = await import('zod');
  return {
    loadConfig: vi.fn().mockResolvedValue({
      llm: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
      },
    }),
    ArchetypeEnum: z.string().min(1),
  };
});

// Mock the LLM module to prevent loading OpenAI
vi.mock('../core/llm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/llm')>();
  return {
    createLLMProvider: vi.fn(),
    calculateLLMCost: actual.calculateLLMCost,
  };
});

// Import after mocks
import { generateScript, ScriptOutput } from './generator';

describe('Script Generator', () => {
  let fakeLLM: FakeLLMProvider;

  beforeEach(() => {
    fakeLLM = new FakeLLMProvider();
  });

  describe('generateScript', () => {
    it('should generate a listicle script with scenes', async () => {
      // Queue a valid LLM response with new schema
      fakeLLM.queueJsonResponse({
        scenes: [
          {
            text: 'Stop making these JavaScript mistakes!',
            visualDirection: 'developer frustrated',
            mood: 'dramatic',
          },
          {
            text: 'Number one: Use const by default.',
            visualDirection: 'code editor',
            mood: 'explanatory',
          },
          {
            text: 'Number two: Destructure your objects.',
            visualDirection: 'javascript code',
            mood: 'explanatory',
          },
          {
            text: 'Number three: Use optional chaining.',
            visualDirection: 'modern code',
            mood: 'explanatory',
          },
          {
            text: 'Apply these tips and level up your code!',
            visualDirection: 'success celebration',
            mood: 'positive',
          },
        ],
        reasoning: 'Used hook-body-CTA structure with numbered tips for listicle format.',
        title: '5 JavaScript Tips You Need to Know',
        hook: 'Stop making these JavaScript mistakes!',
        cta: 'Follow for more JavaScript tips!',
      });

      const result = await generateScript({
        topic: '5 JavaScript tips',
        archetype: ArchetypeIdSchema.parse('listicle'),
        targetDuration: 45,
        llmProvider: fakeLLM,
      });

      // Validate structure
      expect(result.title).toBe('5 JavaScript Tips You Need to Know');
      expect(result.hook).toBe('Stop making these JavaScript mistakes!');
      expect(result.scenes).toHaveLength(5);
      expect(result.reasoning).toContain('hook-body-CTA');
      expect(result.cta).toBe('Follow for more JavaScript tips!');

      // Validate metadata
      expect(result.meta?.archetype).toBe('listicle');
      expect(result.meta?.topic).toBe('5 JavaScript tips');
      expect(result.meta?.wordCount).toBeGreaterThan(0);
    });

    it('should generate a versus script', async () => {
      fakeLLM.queueJsonResponse({
        scenes: [
          {
            text: 'React or Vue? Let me settle this debate.',
            visualDirection: 'vs graphic',
            mood: 'dramatic',
          },
          {
            text: 'Learning curve: Vue is easier to start with.',
            visualDirection: 'learning chart',
            mood: 'analytical',
          },
          {
            text: 'Job market: React has more opportunities.',
            visualDirection: 'job listings',
            mood: 'informative',
          },
          {
            text: 'My verdict: Start with Vue, but learn React eventually.',
            visualDirection: 'conclusion graphic',
            mood: 'decisive',
          },
        ],
        reasoning: 'Compared two frameworks objectively with pros and cons.',
        title: 'React vs Vue: Which Should You Learn?',
        hook: 'React or Vue? Let me settle this debate.',
        cta: 'What do you think? Comment below!',
      });

      const result = await generateScript({
        topic: 'React vs Vue',
        archetype: ArchetypeIdSchema.parse('versus'),
        llmProvider: fakeLLM,
      });

      expect(result.meta?.archetype).toBe('versus');
      expect(result.scenes).toHaveLength(4);
    });

    it('should attach packaging info when provided', async () => {
      fakeLLM.queueJsonResponse({
        scenes: [
          { text: 'Hook line', visualDirection: 'hook' },
          { text: 'Body line', visualDirection: 'body' },
          { text: 'CTA line', visualDirection: 'cta' },
        ],
        reasoning: 'Test reasoning.',
        title: 'LLM title (should be overridden)',
        hook: 'Hook line',
        cta: 'CTA line',
      });

      const packaging = {
        title: 'My packaged title',
        coverText: 'Cover text',
        onScreenHook: 'Muted hook text',
      };

      const result = await generateScript({
        topic: 'test',
        archetype: ArchetypeIdSchema.parse('listicle'),
        llmProvider: fakeLLM,
        packaging,
      });

      expect(result.title).toBe(packaging.title);
      expect(result.extra).toMatchObject({ virality: { packaging } });

      const lastCall = fakeLLM.getLastCall();
      const userMessage = lastCall?.find((m) => m.role === 'user');
      expect(userMessage?.content).toContain(packaging.title);
    });

    it('should validate LLM response schema', async () => {
      // Queue an invalid response (missing required fields)
      fakeLLM.queueJsonResponse({
        title: 'Test',
        // Missing scenes and reasoning
      });

      await expect(
        generateScript({
          topic: 'test',
          archetype: ArchetypeIdSchema.parse('listicle'),
          llmProvider: fakeLLM,
        })
      ).rejects.toThrow();
    });

    it('should calculate word count correctly', async () => {
      fakeLLM.queueJsonResponse({
        scenes: [
          { text: 'This is a hook with some words.', visualDirection: 'test' },
          { text: 'This is point one with several more words.', visualDirection: 'test' },
          { text: 'This is point two.', visualDirection: 'test' },
        ],
        reasoning: 'Test reasoning.',
        title: 'Test Video',
        hook: 'This is a hook.',
        cta: 'Follow me!',
      });

      const result = await generateScript({
        topic: 'test',
        archetype: ArchetypeIdSchema.parse('listicle'),
        llmProvider: fakeLLM,
      });

      // Verify word count is calculated
      expect(result.meta?.wordCount).toBeGreaterThan(10);
    });

    it('should avoid repeating the hook as the first sentence', async () => {
      fakeLLM.queueJsonResponse({
        scenes: [
          {
            text: "This week, major global events are shaking up the headlines. Here's what matters most.",
            visualDirection: 'news montage',
            mood: 'urgent',
          },
          { text: '1: First headline.', visualDirection: 'test' },
        ],
        reasoning: 'Test reasoning.',
        title: 'Test',
        hook: 'Major global events are shaking up the headlines this week.',
        cta: 'Follow for more.',
      });

      const result = await generateScript({
        topic: 'test',
        archetype: ArchetypeIdSchema.parse('listicle'),
        llmProvider: fakeLLM,
      });

      expect(result.hook).toContain('Major global events');
      expect(result.scenes[0].text).toBe("Here's what matters most.");
    });

    it('should include scene IDs', async () => {
      fakeLLM.queueJsonResponse({
        scenes: [
          { text: 'Scene one text', visualDirection: 'test' },
          { text: 'Scene two text', visualDirection: 'test' },
          { text: 'Scene three text', visualDirection: 'test' },
        ],
        reasoning: 'Test reasoning.',
        title: 'Test',
        hook: 'Hook text',
      });

      const result = await generateScript({
        topic: 'test',
        archetype: ArchetypeIdSchema.parse('listicle'),
        llmProvider: fakeLLM,
      });

      // Check scene IDs are generated
      expect(result.scenes[0].id).toBe('scene-001');
      expect(result.scenes[1].id).toBe('scene-002');
      expect(result.scenes[2].id).toBe('scene-003');
    });

    it('should pass correct prompt for each archetype', async () => {
      const archetypes = ['listicle', 'versus', 'howto', 'myth', 'story', 'hot-take'] as const;

      for (const archetype of archetypes) {
        fakeLLM.reset();
        fakeLLM.queueJsonResponse({
          scenes: [{ text: 'Test hook', visualDirection: 'test' }],
          reasoning: 'Test reasoning.',
          title: `Test ${archetype}`,
          hook: 'Test hook',
        });

        await generateScript({
          topic: 'test topic',
          archetype: ArchetypeIdSchema.parse(archetype),
          llmProvider: fakeLLM,
        });

        // Verify LLM was called with appropriate prompt
        const calls = fakeLLM.getCalls();
        expect(calls).toHaveLength(1);

        const userMessage = calls[0].find((m) => m.role === 'user');
        expect(userMessage?.content).toContain('test topic');
      }
    });
  });

  describe('ScriptOutputSchema', () => {
    it('should validate correct output with new schema', () => {
      const validOutput: ScriptOutput = {
        schemaVersion: SCRIPT_SCHEMA_VERSION,
        scenes: [
          { id: 'scene-001', text: 'Hook text', visualDirection: 'dramatic opening' },
          { id: 'scene-002', text: 'Point text', visualDirection: 'illustration' },
        ],
        reasoning: 'Used hook-body structure for engagement.',
        title: 'Test Video',
        hook: 'Attention grabbing hook',
        meta: {
          wordCount: 10,
          estimatedDuration: 4,
          archetype: ArchetypeIdSchema.parse('listicle'),
          topic: 'test',
          generatedAt: new Date().toISOString(),
        },
      };

      const result = ScriptOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject empty scenes', () => {
      const invalidOutput = {
        schemaVersion: SCRIPT_SCHEMA_VERSION,
        scenes: [],
        reasoning: 'Test',
        title: 'Title',
      };

      const result = ScriptOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should require reasoning field', () => {
      const invalidOutput = {
        schemaVersion: SCRIPT_SCHEMA_VERSION,
        scenes: [{ id: 'scene-001', text: 'Test', visualDirection: 'test' }],
        title: 'Title',
        // Missing reasoning
      };

      const result = ScriptOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should allow optional hashtags', () => {
      const validOutput: ScriptOutput = {
        schemaVersion: SCRIPT_SCHEMA_VERSION,
        scenes: [{ id: 'scene-001', text: 'Test', visualDirection: 'test' }],
        reasoning: 'Test reasoning.',
        hashtags: ['#javascript', '#coding', '#tips'],
        meta: {
          archetype: ArchetypeIdSchema.parse('listicle'),
          topic: 'test',
          generatedAt: new Date().toISOString(),
        },
      };

      const result = ScriptOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hashtags).toHaveLength(3);
      }
    });
  });

  describe('LLMScriptResponseSchema', () => {
    it('should validate minimal LLM response', () => {
      const response = {
        scenes: [{ text: 'Test text', visualDirection: 'test visual' }],
        reasoning: 'Test reasoning',
      };

      const result = LLMScriptResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate full LLM response', () => {
      const response = {
        scenes: [
          { text: 'Scene 1', visualDirection: 'visual 1', mood: 'dramatic' },
          { text: 'Scene 2', visualDirection: 'visual 2' },
        ],
        reasoning: 'Full reasoning here',
        title: 'Full Title',
        hook: 'Hook text',
        cta: 'Call to action',
        hashtags: ['#test'],
      };

      const result = LLMScriptResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should attempt to shorten scripts that exceed target length', async () => {
      // First response is intentionally too long.
      fakeLLM.queueJsonResponse({
        scenes: new Array(6).fill(null).map((_, i) => ({
          text: `Scene ${i + 1}: ` + new Array(40).fill('word').join(' '),
          visualDirection: 'b-roll',
          mood: 'informative',
        })),
        reasoning: 'Long on purpose for test.',
        title: 'Too Long',
        hook: new Array(40).fill('hook').join(' '),
        cta: new Array(40).fill('cta').join(' '),
      });

      // Second response is shorter.
      fakeLLM.queueJsonResponse({
        scenes: new Array(6).fill(null).map((_, i) => ({
          text: `Scene ${i + 1}: short and punchy.`,
          visualDirection: 'b-roll',
          mood: 'informative',
        })),
        reasoning: 'Shortened version.',
        title: 'Short Enough',
        hook: 'Quick update.',
        cta: 'Follow for more.',
      });

      const result = await generateScript({
        topic: 'Global news roundup',
        archetype: ArchetypeIdSchema.parse('listicle'),
        targetDuration: 30,
        llmProvider: fakeLLM,
      });

      expect(result.title).toBe('Short Enough');
      expect(result.meta?.wordCount).toBeLessThanOrEqual(94);
    });
  });
});
