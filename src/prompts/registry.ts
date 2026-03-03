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

const VALID_CATEGORIES = new Set<PromptCategory>([
  'script',
  'visuals',
  'image-generation',
  'editing',
  'metadata',
]);
const VALID_PROVIDERS = new Set<PromptProvider>(['openai', 'anthropic', 'gemini', 'pexels', 'any']);
const VALID_OUTPUT_FORMATS = new Set(['json', 'text', 'markdown', 'structured']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractPlaceholders(input: string): Set<string> {
  const placeholders = new Set<string>();
  const regex = /\{\{\s*([A-Za-z_]\w*)\s*\}\}/g;
  let match: RegExpExecArray | null = regex.exec(input);
  while (match) {
    if (match[1] !== 'else') {
      placeholders.add(match[1]);
    }
    match = regex.exec(input);
  }
  return placeholders;
}

function validateRequiredStringFields(raw: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const requiredStringFields = [
    'id',
    'name',
    'description',
    'category',
    'provider',
    'outputFormat',
    'version',
    'template',
  ];
  for (const field of requiredStringFields) {
    if (typeof raw[field] !== 'string' || raw[field].trim().length === 0) {
      errors.push(`missing or invalid field: ${field}`);
    }
  }
  return errors;
}

function validateTemplateVariables(raw: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!Array.isArray(raw.variables)) {
    return ['missing or invalid field: variables'];
  }

  const seenVariableNames = new Set<string>();
  for (const variable of raw.variables) {
    if (!isObject(variable)) {
      errors.push('invalid variable entry: expected object');
      continue;
    }
    const name = variable.name;
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('invalid variable entry: missing name');
      continue;
    }
    if (seenVariableNames.has(name)) {
      errors.push(`duplicate variable name: ${name}`);
    }
    seenVariableNames.add(name);
  }
  return errors;
}

function validateTemplateEnums(raw: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!Array.isArray(raw.tags)) {
    errors.push('missing or invalid field: tags');
  }

  if (typeof raw.category === 'string' && !VALID_CATEGORIES.has(raw.category as PromptCategory)) {
    errors.push(`invalid category: ${raw.category}`);
  }

  if (typeof raw.provider === 'string' && !VALID_PROVIDERS.has(raw.provider as PromptProvider)) {
    errors.push(`invalid provider: ${raw.provider}`);
  }

  if (typeof raw.outputFormat === 'string' && !VALID_OUTPUT_FORMATS.has(raw.outputFormat)) {
    errors.push(`invalid outputFormat: ${raw.outputFormat}`);
  }
  return errors;
}

function validateTemplatePlaceholders(raw: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!(typeof raw.template === 'string' && Array.isArray(raw.variables))) {
    return errors;
  }

  const placeholderNames = extractPlaceholders(raw.template);
  const knownVariables = new Set(
    raw.variables
      .filter((v): v is Record<string, unknown> => isObject(v))
      .map((v) => v.name)
      .filter((name): name is string => typeof name === 'string')
  );
  for (const placeholder of placeholderNames) {
    if (!knownVariables.has(placeholder)) {
      errors.push(`template placeholder has no variable definition: ${placeholder}`);
    }
  }
  return errors;
}

function validatePromptTemplate(raw: unknown): string[] {
  if (!isObject(raw)) {
    return ['template must be an object'];
  }

  const errors: string[] = [];
  errors.push(...validateRequiredStringFields(raw));
  errors.push(...validateTemplateVariables(raw));
  errors.push(...validateTemplateEnums(raw));
  errors.push(...validateTemplatePlaceholders(raw));

  return errors;
}

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
      const files = readdirSync(categoryDir).filter(
        (f) => f.endsWith('.yaml') || f.endsWith('.yml')
      );

      for (const file of files) {
        try {
          const content = readFileSync(join(categoryDir, file), 'utf-8');
          const template = parseYaml(content) as unknown;
          const errors = validatePromptTemplate(template);
          if (errors.length > 0) {
            console.warn(`Skipping invalid prompt template ${file}: ${errors.join('; ')}`);
            continue;
          }
          const typedTemplate = template as PromptTemplate;
          if (this.templates.has(typedTemplate.id)) {
            console.warn(
              `Skipping duplicate prompt template id "${typedTemplate.id}" from ${file}`
            );
            continue;
          }
          this.templates.set(typedTemplate.id, typedTemplate);
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
    const errors = validatePromptTemplate(template);
    if (errors.length > 0) {
      throw new Error(`Invalid prompt template: ${errors.join('; ')}`);
    }
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
export function searchPrompts(
  query: string,
  options: Omit<PromptSearchOptions, 'query'> = {}
): PromptSearchResult[] {
  return PromptRegistry.search({ ...options, query });
}

/**
 * Render a prompt template with variables
 */
export function renderPrompt(
  template: PromptTemplate,
  variables: Record<string, unknown>
): RenderedPrompt {
  let rendered = template.template;

  // Handle simple conditionals before raw placeholder cleanup.
  // Supports:
  // - {{#if var}}...{{/if}}
  // - {{#if var}}...{{else}}...{{/if}}
  rendered = rendered.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (_, varName: string, ifContent: string, elseContent?: string) => {
      const value = variables[varName];
      return value ? ifContent : (elseContent ?? '');
    }
  );

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
