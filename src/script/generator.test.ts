/**
 * Script Generator Tests
 * Updated for SYSTEM-DESIGN §6.3 GeneratedScriptSchema
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptOutputSchema, LLMScriptResponseSchema, SCRIPT_SCHEMA_VERSION } from './schema';
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
    it('should generate a listicle script with scenes', async () => {
      // Queue a valid LLM response with new schema
      fakeLLM.queueJsonResponse({
        scenes: [
          { text: 'Stop making these JavaScript mistakes!', visualDirection: 'developer frustrated', mood: 'dramatic' },
          { text: 'Number one: Use const by default.', visualDirection: 'code editor', mood: 'explanatory' },
          { text: 'Number two: Destructure your objects.', visualDirection: 'javascript code', mood: 'explanatory' },
          { text: 'Number three: Use optional chaining.', visualDirection: 'modern code', mood: 'explanatory' },
          { text: 'Apply these tips and level up your code!', visualDirection: 'success celebration', mood: 'positive' },
        ],
        reasoning: 'Used hook-body-CTA structure with numbered tips for listicle format.',
        title: '5 JavaScript Tips You Need to Know',
        hook: 'Stop making these JavaScript mistakes!',
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
          { text: 'React or Vue? Let me settle this debate.', visualDirection: 'vs graphic', mood: 'dramatic' },
          { text: 'Learning curve: Vue is easier to start with.', visualDirection: 'learning chart', mood: 'analytical' },
          { text: 'Job market: React has more opportunities.', visualDirection: 'job listings', mood: 'informative' },
          { text: 'My verdict: Start with Vue, but learn React eventually.', visualDirection: 'conclusion graphic', mood: 'decisive' },
        ],
        reasoning: 'Compared two frameworks objectively with pros and cons.',
        title: 'React vs Vue: Which Should You Learn?',
        hook: 'React or Vue? Let me settle this debate.',
        cta: 'What do you think? Comment below!',
      });
      
      const result = await generateScript({
        topic: 'React vs Vue',
        archetype: 'versus',
        llmProvider: fakeLLM,
      });
      
      expect(result.meta?.archetype).toBe('versus');
      expect(result.scenes).toHaveLength(4);
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
          archetype: 'listicle',
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
        archetype: 'listicle',
        llmProvider: fakeLLM,
      });
      
      // Verify word count is calculated
      expect(result.meta?.wordCount).toBeGreaterThan(10);
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
        archetype: 'listicle',
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
          scenes: [
            { text: 'Test hook', visualDirection: 'test' },
          ],
          reasoning: 'Test reasoning.',
          title: `Test ${archetype}`,
          hook: 'Test hook',
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
          archetype: 'listicle',
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
        scenes: [
          { id: 'scene-001', text: 'Test', visualDirection: 'test' },
        ],
        title: 'Title',
        // Missing reasoning
      };
      
      const result = ScriptOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
    
    it('should allow optional hashtags', () => {
      const validOutput: ScriptOutput = {
        schemaVersion: SCRIPT_SCHEMA_VERSION,
        scenes: [
          { id: 'scene-001', text: 'Test', visualDirection: 'test' },
        ],
        reasoning: 'Test reasoning.',
        hashtags: ['#javascript', '#coding', '#tips'],
        meta: {
          archetype: 'listicle',
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
        scenes: [
          { text: 'Test text', visualDirection: 'test visual' },
        ],
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
  });
});
