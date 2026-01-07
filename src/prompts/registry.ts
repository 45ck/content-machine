/**
 * Prompt Registry
 *
 * Searchable registry of prompt templates for content generation.
 * Supports semantic search by category, tags, and keywords.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import type {
  PromptTemplate,
  PromptCategory,
  PromptProvider,
  PromptSearchOptions,
  PromptSearchResult,
  RenderedPrompt,
} from './types';

/**
 * In-memory prompt registry
 */
class PromptRegistryImpl {
  private templates: Map<string, PromptTemplate> = new Map();
  private loaded = false;

  /**
   * Load all prompt templates from disk
   */
  load(): void {
    if (this.loaded) return;

    const templatesDir = join(__dirname, 'templates');
    if (!existsSync(templatesDir)) {
      console.warn('Prompt templates directory not found:', templatesDir);
      return;
    }

    const categories = readdirSync(templatesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const category of categories) {
      const categoryDir = join(templatesDir, category);
      const files = readdirSync(categoryDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

      for (const file of files) {
        try {
          const content = readFileSync(join(categoryDir, file), 'utf-8');
          const template = parseYaml(content) as PromptTemplate;
          this.templates.set(template.id, template);
        } catch (error) {
          console.warn(`Failed to load prompt template ${file}:`, error);
        }
      }
    }

    this.loaded = true;
  }

  /**
   * Ensure templates are loaded
   */
  private ensureLoaded(): void {
    if (!this.loaded) {
      this.load();
    }
  }

  /**
   * Get a prompt template by ID
   */
  get(id: string): PromptTemplate | undefined {
    this.ensureLoaded();
    return this.templates.get(id);
  }

  /**
   * List all prompt templates
   */
  list(): PromptTemplate[] {
    this.ensureLoaded();
    return Array.from(this.templates.values());
  }

  /**
   * List templates by category
   */
  listByCategory(category: PromptCategory): PromptTemplate[] {
    this.ensureLoaded();
    return this.list().filter((t) => t.category === category);
  }

  /**
   * List templates by provider
   */
  listByProvider(provider: PromptProvider): PromptTemplate[] {
    this.ensureLoaded();
    return this.list().filter((t) => t.provider === provider || t.provider === 'any');
  }

  /**
   * Search templates by various criteria
   */
  search(options: PromptSearchOptions): PromptSearchResult[] {
    this.ensureLoaded();
    let results = this.list();

    // Filter by category
    if (options.category) {
      results = results.filter((t) => t.category === options.category);
    }

    // Filter by provider
    if (options.provider) {
      results = results.filter((t) => t.provider === options.provider || t.provider === 'any');
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter((t) => options.tags!.every((tag) => t.tags.includes(tag)));
    }

    // Search by query (name, description, tags)
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter((t) => {
        const searchable = [t.name, t.description, ...t.tags].join(' ').toLowerCase();
        return searchable.includes(query);
      });
    }

    // Score and sort results
    const scored = results.map((template) => {
      const score = this.calculateRelevanceScore(template, options);
      const matchedKeywords = this.findMatchedKeywords(template, options);
      return { template, score, matchedKeywords };
    });

    scored.sort((a, b) => b.score - a.score);

    // Apply limit
    if (options.limit) {
      return scored.slice(0, options.limit);
    }

    return scored;
  }

  /**
   * Calculate relevance score for a template
   */
  private calculateRelevanceScore(template: PromptTemplate, options: PromptSearchOptions): number {
    let score = 0.5; // Base score

    if (options.query) {
      const query = options.query.toLowerCase();

      // Exact name match
      if (template.name.toLowerCase() === query) {
        score += 0.3;
      }
      // Name contains query
      else if (template.name.toLowerCase().includes(query)) {
        score += 0.2;
      }

      // Tag match
      if (template.tags.some((tag) => tag.toLowerCase() === query)) {
        score += 0.15;
      }

      // Description match
      if (template.description.toLowerCase().includes(query)) {
        score += 0.1;
      }
    }

    // Category match bonus
    if (options.category && template.category === options.category) {
      score += 0.1;
    }

    // Provider match bonus
    if (options.provider && template.provider === options.provider) {
      score += 0.05;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Find keywords that matched the search
   */
  private findMatchedKeywords(template: PromptTemplate, options: PromptSearchOptions): string[] {
    const matched: string[] = [];

    if (options.query) {
      const query = options.query.toLowerCase();
      if (template.name.toLowerCase().includes(query)) {
        matched.push(template.name);
      }
      template.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(query)) {
          matched.push(tag);
        }
      });
    }

    if (options.tags) {
      options.tags.forEach((tag) => {
        if (template.tags.includes(tag)) {
          matched.push(tag);
        }
      });
    }

    return matched;
  }

  /**
   * Register a new template programmatically
   */
  register(template: PromptTemplate): void {
    this.ensureLoaded();
    this.templates.set(template.id, template);
  }

  /**
   * Get count of templates
   */
  get count(): number {
    this.ensureLoaded();
    return this.templates.size;
  }
}

/**
 * Singleton registry instance
 */
export const PromptRegistry = new PromptRegistryImpl();

/**
 * Get a prompt template by ID
 */
export function getPrompt(id: string): PromptTemplate | undefined {
  return PromptRegistry.get(id);
}

/**
 * Search prompts by keyword or criteria
 */
export function searchPrompts(query: string, options: Omit<PromptSearchOptions, 'query'> = {}): PromptSearchResult[] {
  return PromptRegistry.search({ ...options, query });
}

/**
 * Render a prompt template with variables
 */
export function renderPrompt(template: PromptTemplate, variables: Record<string, unknown>): RenderedPrompt {
  let rendered = template.template;

  // Simple variable substitution ({{variable}})
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(pattern, String(value ?? ''));
  }

  // Handle defaults for missing variables
  for (const varDef of template.variables) {
    if (!(varDef.name in variables) && varDef.default !== undefined) {
      const pattern = new RegExp(`\\{\\{${varDef.name}\\}\\}`, 'g');
      rendered = rendered.replace(pattern, String(varDef.default));
    }
  }

  // Clean up any remaining unsubstituted variables
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

  // Handle simple conditionals ({{#if var}}...{{/if}})
  rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, content) => {
    const value = variables[varName];
    return value ? content : '';
  });

  return {
    system: template.systemPrompt,
    user: rendered.trim(),
    meta: {
      templateId: template.id,
      templateVersion: template.version,
      renderedAt: new Date().toISOString(),
      variables,
    },
  };
}

/**
 * List all available prompt categories
 */
export function listCategories(): PromptCategory[] {
  return ['script', 'visuals', 'image-generation', 'editing', 'metadata'];
}

/**
 * List all available providers
 */
export function listProviders(): PromptProvider[] {
  return ['openai', 'anthropic', 'gemini', 'pexels', 'any'];
}
