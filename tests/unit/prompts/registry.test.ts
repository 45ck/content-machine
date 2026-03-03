/**
 * Prompt Registry Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  PromptRegistry,
  getPrompt,
  searchPrompts,
  renderPrompt,
  listCategories,
  listProviders,
  PROMPT_IDS,
  SEED_CREATIVE_PROMPTS,
} from '../../../src/prompts';
import type { PromptTemplate } from '../../../src/prompts/types';

describe('PromptRegistry', () => {
  beforeEach(() => {
    // Force reload of templates
    PromptRegistry.load();
  });

  describe('load()', () => {
    it('should load prompt templates from disk', () => {
      expect(PromptRegistry.count).toBeGreaterThan(0);
    });
  });

  describe('get()', () => {
    it('should return a template by ID', () => {
      const template = PromptRegistry.get(PROMPT_IDS.SCRIPT_VIDEO_GENERATOR);
      expect(template).toBeDefined();
      expect(template?.id).toBe(PROMPT_IDS.SCRIPT_VIDEO_GENERATOR);
    });

    it('should return undefined for unknown ID', () => {
      const template = PromptRegistry.get('nonexistent/template');
      expect(template).toBeUndefined();
    });
  });

  describe('list()', () => {
    it('should return all templates', () => {
      const templates = PromptRegistry.list();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every((t) => t.id)).toBe(true);
    });
  });

  describe('listByCategory()', () => {
    it('should filter by script category', () => {
      const templates = PromptRegistry.listByCategory('script');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every((t) => t.category === 'script')).toBe(true);
    });

    it('should filter by image-generation category', () => {
      const templates = PromptRegistry.listByCategory('image-generation');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every((t) => t.category === 'image-generation')).toBe(true);
    });
  });

  describe('listByProvider()', () => {
    it('should include provider-specific and any templates', () => {
      const templates = PromptRegistry.listByProvider('gemini');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every((t) => t.provider === 'gemini' || t.provider === 'any')).toBe(true);
    });
  });

  describe('search()', () => {
    it('should search by query', () => {
      const results = searchPrompts('cinematic');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should search by category', () => {
      const results = PromptRegistry.search({ category: 'visuals' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.template.category === 'visuals')).toBe(true);
    });

    it('should search by tags', () => {
      const results = PromptRegistry.search({ tags: ['nano-banana'] });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.template.tags.includes('nano-banana'))).toBe(true);
    });

    it('should find Seed Creative stack prompts by tags', () => {
      const results = PromptRegistry.search({ tags: ['seedance'] });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.template.id === PROMPT_IDS.VISUALS_SEEDANCE_SHOT_SPEC)).toBe(
        true
      );
    });

    it('should limit results', () => {
      const results = PromptRegistry.search({ limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return matched keywords', () => {
      const results = searchPrompts('script');
      const result = results.find((r) => r.matchedKeywords.length > 0);
      expect(result).toBeDefined();
    });
  });

  describe('register()', () => {
    it('should add a new template', () => {
      const template: PromptTemplate = {
        id: 'test/custom-template',
        name: 'Custom Test Template',
        description: 'A test template',
        category: 'script',
        provider: 'any',
        outputFormat: 'text',
        version: '1.0.0',
        template: 'Test {{variable}}',
        variables: [{ name: 'variable', description: 'Test var', required: true }],
        tags: ['test'],
      };

      PromptRegistry.register(template);
      const retrieved = PromptRegistry.get('test/custom-template');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Test Template');
    });

    it('should reject invalid template payloads', () => {
      const invalidTemplate = {
        id: 'test/invalid-template',
        name: 'Invalid Template',
        description: 'Missing required variable declaration',
        category: 'script',
        provider: 'any',
        outputFormat: 'text',
        version: '1.0.0',
        template: 'Hello {{name}}',
        variables: [],
        tags: ['test'],
      } as unknown as PromptTemplate;

      expect(() => PromptRegistry.register(invalidTemplate)).toThrow(/Invalid prompt template/);
    });
  });
});

describe('getPrompt()', () => {
  it('should be a shorthand for PromptRegistry.get()', () => {
    const template = getPrompt(PROMPT_IDS.SCRIPT_VIDEO_GENERATOR);
    expect(template).toBeDefined();
  });
});

describe('renderPrompt()', () => {
  it('should substitute variables', () => {
    const template: PromptTemplate = {
      id: 'test/render',
      name: 'Test',
      description: 'Test',
      category: 'script',
      provider: 'any',
      outputFormat: 'text',
      version: '1.0.0',
      template: 'Hello {{name}}, your topic is {{topic}}.',
      variables: [
        { name: 'name', description: 'Name', required: true },
        { name: 'topic', description: 'Topic', required: true },
      ],
      tags: [],
    };

    const rendered = renderPrompt(template, { name: 'Alice', topic: 'Redis' });
    expect(rendered.user).toBe('Hello Alice, your topic is Redis.');
  });

  it('should apply default values', () => {
    const template: PromptTemplate = {
      id: 'test/defaults',
      name: 'Test',
      description: 'Test',
      category: 'script',
      provider: 'any',
      outputFormat: 'text',
      version: '1.0.0',
      template: 'Language: {{language}}',
      variables: [{ name: 'language', description: 'Lang', required: false, default: 'en' }],
      tags: [],
    };

    const rendered = renderPrompt(template, {});
    expect(rendered.user).toBe('Language: en');
  });

  it('should include system prompt if present', () => {
    const template: PromptTemplate = {
      id: 'test/system',
      name: 'Test',
      description: 'Test',
      category: 'script',
      provider: 'any',
      outputFormat: 'text',
      version: '1.0.0',
      systemPrompt: 'You are a helpful assistant.',
      template: 'Hello',
      variables: [],
      tags: [],
    };

    const rendered = renderPrompt(template, {});
    expect(rendered.system).toBe('You are a helpful assistant.');
  });

  it('should include metadata', () => {
    const template: PromptTemplate = {
      id: 'test/meta',
      name: 'Test',
      description: 'Test',
      category: 'script',
      provider: 'any',
      outputFormat: 'text',
      version: '2.0.0',
      template: 'Hello',
      variables: [],
      tags: [],
    };

    const rendered = renderPrompt(template, { foo: 'bar' });
    expect(rendered.meta.templateId).toBe('test/meta');
    expect(rendered.meta.templateVersion).toBe('2.0.0');
    expect(rendered.meta.variables).toEqual({ foo: 'bar' });
    expect(rendered.meta.renderedAt).toBeDefined();
  });

  it('should render if/else blocks when condition is truthy', () => {
    const template: PromptTemplate = {
      id: 'test/if-else-truthy',
      name: 'Test',
      description: 'Test',
      category: 'script',
      provider: 'any',
      outputFormat: 'text',
      version: '1.0.0',
      template: '{{#if metaphor}}Metaphor: {{metaphor}}{{else}}Fallback{{/if}}',
      variables: [{ name: 'metaphor', description: 'Metaphor', required: false }],
      tags: [],
    };

    const rendered = renderPrompt(template, { metaphor: 'light trails' });
    expect(rendered.user).toBe('Metaphor: light trails');
  });

  it('should render if/else blocks when condition is falsy', () => {
    const template: PromptTemplate = {
      id: 'test/if-else-falsy',
      name: 'Test',
      description: 'Test',
      category: 'script',
      provider: 'any',
      outputFormat: 'text',
      version: '1.0.0',
      template: '{{#if metaphor}}Metaphor: {{metaphor}}{{else}}Fallback{{/if}}',
      variables: [{ name: 'metaphor', description: 'Metaphor', required: false }],
      tags: [],
    };

    const rendered = renderPrompt(template, {});
    expect(rendered.user).toBe('Fallback');
  });

  it('should render abstract-concept template without leaking else branch when metaphor is provided', () => {
    const template = getPrompt(PROMPT_IDS.IMAGE_ABSTRACT_CONCEPT);
    expect(template).toBeDefined();

    const rendered = renderPrompt(template!, {
      concept: 'speed and performance',
      metaphor: 'light trails on a highway at night',
    });

    expect(rendered.user).toContain('Visual metaphor: light trails on a highway at night');
    expect(rendered.user).not.toContain(
      'Create a striking visual metaphor that instantly communicates this concept.'
    );
  });
});

describe('listCategories()', () => {
  it('should return all categories', () => {
    const categories = listCategories();
    expect(categories).toContain('script');
    expect(categories).toContain('visuals');
    expect(categories).toContain('image-generation');
    expect(categories).toContain('editing');
  });
});

describe('listProviders()', () => {
  it('should return all providers', () => {
    const providers = listProviders();
    expect(providers).toContain('openai');
    expect(providers).toContain('gemini');
    expect(providers).toContain('any');
  });
});

describe('PROMPT_IDS', () => {
  it('should have valid IDs', () => {
    expect(PROMPT_IDS.SCRIPT_VIDEO_GENERATOR).toBe('script/video-script-generator');
    expect(PROMPT_IDS.IMAGE_CINEMATIC_SCENE).toBe('image-generation/cinematic-scene');
    expect(PROMPT_IDS.IMAGE_SEEDREAM_HERO_STILL).toBe('image-generation/seedream-hero-still');
    expect(PROMPT_IDS.IMAGE_SEEDREAM_REFERENCE_ANCHORED).toBe(
      'image-generation/seedream-reference-anchored'
    );
    expect(PROMPT_IDS.IMAGE_SEEDREAM_STYLIZED_REMIX).toBe(
      'image-generation/seedream-stylized-remix'
    );
    expect(PROMPT_IDS.VISUALS_SEEDANCE_SHOT_SPEC).toBe('visuals/seedance-shot-spec');
  });

  it('should resolve Seed Creative templates from registry', () => {
    expect(getPrompt(PROMPT_IDS.IMAGE_SEEDREAM_HERO_STILL)).toBeDefined();
    expect(getPrompt(PROMPT_IDS.IMAGE_SEEDREAM_REFERENCE_ANCHORED)).toBeDefined();
    expect(getPrompt(PROMPT_IDS.IMAGE_SEEDREAM_STYLIZED_REMIX)).toBeDefined();
    expect(getPrompt(PROMPT_IDS.VISUALS_SEEDANCE_SHOT_SPEC)).toBeDefined();
  });
});

describe('SEED_CREATIVE_PROMPTS', () => {
  it('should expose stable aliases for Seed prompt templates', () => {
    expect(SEED_CREATIVE_PROMPTS.seedreamHeroStill).toBe(PROMPT_IDS.IMAGE_SEEDREAM_HERO_STILL);
    expect(SEED_CREATIVE_PROMPTS.seedreamReferenceAnchored).toBe(
      PROMPT_IDS.IMAGE_SEEDREAM_REFERENCE_ANCHORED
    );
    expect(SEED_CREATIVE_PROMPTS.seedreamStylizedRemix).toBe(
      PROMPT_IDS.IMAGE_SEEDREAM_STYLIZED_REMIX
    );
    expect(SEED_CREATIVE_PROMPTS.seedanceShotSpec).toBe(PROMPT_IDS.VISUALS_SEEDANCE_SHOT_SPEC);
  });
});

describe('Seed template quality gates', () => {
  it('should render Seed templates without unresolved placeholders', () => {
    const templateInputs: Record<string, Record<string, unknown>> = {
      [PROMPT_IDS.IMAGE_SEEDREAM_HERO_STILL]: {
        characterBrief: 'fictional antihero with glasses and shaved head',
      },
      [PROMPT_IDS.IMAGE_SEEDREAM_REFERENCE_ANCHORED]: {
        newScene: 'walking through a dim lab corridor',
      },
      [PROMPT_IDS.IMAGE_SEEDREAM_STYLIZED_REMIX]: {
        archetypeBrief: 'stoic science-teacher antihero',
        scene: 'standing in a desert workspace at dusk',
      },
      [PROMPT_IDS.VISUALS_SEEDANCE_SHOT_SPEC]: {
        subject: 'fictional antihero chemistry teacher',
        action: 'walks toward camera and adjusts glasses',
        environment: 'desert roadside at golden hour',
      },
    };

    for (const [templateId, inputs] of Object.entries(templateInputs)) {
      const template = getPrompt(templateId);
      expect(template).toBeDefined();
      const rendered = renderPrompt(template!, inputs);
      expect(rendered.user).not.toMatch(/\{\{[^}]+\}\}/);
    }
  });

  it('should keep rendered hero still prompt stable (golden snapshot)', () => {
    const template = getPrompt(PROMPT_IDS.IMAGE_SEEDREAM_HERO_STILL);
    expect(template).toBeDefined();

    const rendered = renderPrompt(template!, {
      characterBrief: 'fictional antihero chemistry teacher, shaved head, glasses, goatee',
      wardrobe: 'pork pie hat, wireframe glasses, dark green jacket',
      shotSpec: 'medium close-up, eye-level, 50mm lens',
      lighting: 'hard sunset side light with long shadows',
      location: 'desert roadside with an aging RV',
      mood: 'quiet menace',
      aspectRatio: '9:16',
    });

    expect(rendered.user).toMatchInlineSnapshot(`
      "Create a cinematic hero still of a fictional character with this brief: fictional antihero chemistry teacher, shaved head, glasses, goatee.

      Wardrobe anchors: pork pie hat, wireframe glasses, dark green jacket.
      Shot specification: medium close-up, eye-level, 50mm lens.
      Lighting: hard sunset side light with long shadows.
      Location and set dressing: desert roadside with an aging RV.
      Mood: quiet menace.
      Aspect ratio: 9:16.

      Keep one clear subject, one face, natural anatomy, and coherent hands.
      Preserve wardrobe consistency and avoid style drift.
      No text, no logo, no watermark."
    `);
  });
});
