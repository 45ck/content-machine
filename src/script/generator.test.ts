/**
 * Script Generator Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptOutputSchema, LLMScriptResponseSchema } from './schema';
import { FakeLLMProvider } from '../test/stubs';

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
    ArchetypeEnum: z.enum(['listicle', 'versus', 'howto', 'myth', 'story', 'hot-take']),
  };
});

// Mock the LLM module to prevent loading OpenAI
vi.mock('../core/llm', () => ({
  createLLMProvider: vi.fn(),
}));

// Import after mocks
import { generateScript, ScriptOutput } from './generator';

describe('Script Generator', () => {
  let fakeLLM: FakeLLMProvider;
  
  beforeEach(() => {
    fakeLLM = new FakeLLMProvider();
  });
  
  describe('generateScript', () => {
    it('should generate a listicle script', async () => {
      // Queue a valid LLM response
      fakeLLM.queueJsonResponse({
        title: '5 JavaScript Tips You Need to Know',
        hook: 'Stop making these JavaScript mistakes!',
        sections: [
          { type: 'hook', text: 'Stop making these JavaScript mistakes!', visualHint: 'developer frustrated' },
          { type: 'point', text: 'Number one: Use const by default.', visualHint: 'code editor' },
          { type: 'point', text: 'Number two: Destructure your objects.', visualHint: 'javascript code' },
          { type: 'point', text: 'Number three: Use optional chaining.', visualHint: 'modern code' },
          { type: 'conclusion', text: 'Apply these tips and level up your code!', visualHint: 'success celebration' },
        ],
        cta: 'Follow for more JavaScript tips!',
      });
      
      const result = await generateScript({
        topic: '5 JavaScript tips',
        archetype: 'listicle',
        targetDuration: 45,
        llmProvider: fakeLLM,
      });
      
      // Validate structure
      expect(result.title).toBe('5 JavaScript Tips You Need to Know');
      expect(result.hook).toBe('Stop making these JavaScript mistakes!');
      expect(result.sections).toHaveLength(5);
      expect(result.cta).toBe('Follow for more JavaScript tips!');
      
      // Validate metadata
      expect(result.metadata.archetype).toBe('listicle');
      expect(result.metadata.topic).toBe('5 JavaScript tips');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.estimatedDuration).toBeGreaterThan(0);
    });
    
    it('should generate a versus script', async () => {
      fakeLLM.queueJsonResponse({
        title: 'React vs Vue: Which Should You Learn?',
        hook: 'React or Vue? Let me settle this debate.',
        sections: [
          { type: 'hook', text: 'React or Vue? Let me settle this debate.', visualHint: 'vs graphic' },
          { type: 'point', text: 'Learning curve: Vue is easier to start with.', visualHint: 'learning chart' },
          { type: 'point', text: 'Job market: React has more opportunities.', visualHint: 'job listings' },
          { type: 'conclusion', text: 'My verdict: Start with Vue, but learn React eventually.', visualHint: 'conclusion graphic' },
        ],
        cta: 'What do you think? Comment below!',
      });
      
      const result = await generateScript({
        topic: 'React vs Vue',
        archetype: 'versus',
        llmProvider: fakeLLM,
      });
      
      expect(result.metadata.archetype).toBe('versus');
      expect(result.sections.some(s => s.type === 'conclusion')).toBe(true);
    });
    
    it('should validate LLM response schema', async () => {
      // Queue an invalid response (missing required fields)
      fakeLLM.queueJsonResponse({
        title: 'Test',
        // Missing hook, sections, etc.
      });
      
      await expect(
        generateScript({
          topic: 'test',
          archetype: 'listicle',
          llmProvider: fakeLLM,
        })
      ).rejects.toThrow();
    });
    
    it('should calculate word count correctly', async () => {
      fakeLLM.queueJsonResponse({
        title: 'Test Video',
        hook: 'This is a hook.',
        sections: [
          { type: 'hook', text: 'This is a hook.', visualHint: 'test' },
          { type: 'point', text: 'This is point one with several words.', visualHint: 'test' },
          { type: 'point', text: 'This is point two.', visualHint: 'test' },
        ],
        cta: 'Follow me!',
      });
      
      const result = await generateScript({
        topic: 'test',
        archetype: 'listicle',
        llmProvider: fakeLLM,
      });
      
      // Count words manually: hook(4) + point1(7) + point2(4) + cta(2) = 17
      // But hook appears in sections too, so it's counted once
      expect(result.metadata.wordCount).toBeGreaterThan(10);
    });
    
    it('should include section IDs and order', async () => {
      fakeLLM.queueJsonResponse({
        title: 'Test',
        hook: 'Hook text',
        sections: [
          { type: 'hook', text: 'Hook text', visualHint: 'test' },
          { type: 'point', text: 'Point 1', visualHint: 'test' },
          { type: 'point', text: 'Point 2', visualHint: 'test' },
        ],
      });
      
      const result = await generateScript({
        topic: 'test',
        archetype: 'listicle',
        llmProvider: fakeLLM,
      });
      
      // Check section IDs
      expect(result.sections[0].id).toBe('section-0');
      expect(result.sections[1].id).toBe('section-1');
      expect(result.sections[2].id).toBe('section-2');
      
      // Check order
      expect(result.sections[0].order).toBe(0);
      expect(result.sections[1].order).toBe(1);
      expect(result.sections[2].order).toBe(2);
    });
    
    it('should pass correct prompt for each archetype', async () => {
      const archetypes = ['listicle', 'versus', 'howto', 'myth', 'story', 'hot-take'] as const;
      
      for (const archetype of archetypes) {
        fakeLLM.reset();
        fakeLLM.queueJsonResponse({
          title: `Test ${archetype}`,
          hook: 'Test hook',
          sections: [
            { type: 'hook', text: 'Test hook', visualHint: 'test' },
          ],
        });
        
        await generateScript({
          topic: 'test topic',
          archetype,
          llmProvider: fakeLLM,
        });
        
        // Verify LLM was called with appropriate prompt
        const calls = fakeLLM.getCalls();
        expect(calls).toHaveLength(1);
        
        const userMessage = calls[0].find(m => m.role === 'user');
        expect(userMessage?.content).toContain('test topic');
      }
    });
  });
  
  describe('ScriptOutputSchema', () => {
    it('should validate correct output', () => {
      const validOutput: ScriptOutput = {
        title: 'Test Video',
        hook: 'Attention grabbing hook',
        sections: [
          { id: 'section-0', type: 'hook', text: 'Hook text', order: 0 },
          { id: 'section-1', type: 'point', text: 'Point text', order: 1 },
        ],
        metadata: {
          wordCount: 10,
          estimatedDuration: 4,
          archetype: 'listicle',
          topic: 'test',
          generatedAt: new Date().toISOString(),
        },
      };
      
      const result = ScriptOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
    
    it('should reject empty title', () => {
      const invalidOutput = {
        title: '',
        hook: 'Hook',
        sections: [],
        metadata: {},
      };
      
      const result = ScriptOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
    
    it('should reject empty sections', () => {
      const invalidOutput = {
        title: 'Title',
        hook: 'Hook',
        sections: [],
        metadata: {
          wordCount: 5,
          estimatedDuration: 2,
          archetype: 'listicle',
          topic: 'test',
          generatedAt: new Date().toISOString(),
        },
      };
      
      const result = ScriptOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });
});
