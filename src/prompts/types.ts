/**
 * Prompt Library Types
 *
 * Type definitions for the content-machine prompt library.
 */

/**
 * Prompt categories for organization and search
 */
export type PromptCategory = 'script' | 'visuals' | 'image-generation' | 'editing' | 'metadata';

/**
 * AI provider the prompt is designed for
 */
export type PromptProvider =
  | 'openai' // GPT-4, DALL-E
  | 'anthropic' // Claude
  | 'gemini' // Gemini, Imagen
  | 'pexels' // Stock video search
  | 'any'; // Provider-agnostic

/**
 * Output format expected from the prompt
 */
export type PromptOutputFormat = 'json' | 'text' | 'markdown' | 'structured';

/**
 * Variable definition for prompt templates
 */
export interface PromptVariable {
  /** Variable name (used in template as {{name}}) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Whether the variable is required */
  required: boolean;
  /** Default value if not provided */
  default?: string | number | boolean;
  /** Example value for documentation */
  example?: string | number | boolean;
  /** Type hint for validation */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

/**
 * Example output for documentation
 */
export interface PromptExample {
  /** Input variables for this example */
  input: Record<string, unknown>;
  /** Expected output (or example output) */
  output: string;
  /** Optional description */
  description?: string;
}

/**
 * Source attribution for vendored prompts
 */
export interface PromptSource {
  /** Repository name (e.g., "MoneyPrinterTurbo") */
  repository: string;
  /** Repository URL */
  url: string;
  /** License type (e.g., "MIT") */
  license: string;
  /** Original file path in the source repo */
  originalPath?: string;
  /** Date the prompt was adapted */
  adaptedDate: string;
  /** Modifications made to the original */
  modifications?: string;
}

/**
 * Complete prompt template definition
 */
export interface PromptTemplate {
  /** Unique identifier (e.g., "script/video-script-generator") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description */
  description: string;
  /** Category for organization */
  category: PromptCategory;
  /** Target AI provider */
  provider: PromptProvider;
  /** Expected output format */
  outputFormat: PromptOutputFormat;
  /** Template version (semver) */
  version: string;

  // === Template Content ===
  /** System prompt (for chat-based APIs) */
  systemPrompt?: string;
  /** Main prompt template with {{variables}} */
  template: string;

  // === Variables ===
  /** Variables used in the template */
  variables: PromptVariable[];

  // === Examples ===
  /** Example inputs/outputs */
  examples?: PromptExample[];

  // === Metadata ===
  /** Tags for search */
  tags: string[];
  /** Source attribution (for vendored prompts) */
  source?: PromptSource;
  /** Estimated token count for the template */
  estimatedTokens?: number;
  /** Temperature recommendation (0-2) */
  recommendedTemperature?: number;
}

/**
 * Search options for the prompt registry
 */
export interface PromptSearchOptions {
  /** Filter by category */
  category?: PromptCategory;
  /** Filter by provider */
  provider?: PromptProvider;
  /** Search in name, description, and tags */
  query?: string;
  /** Filter by tags (all must match) */
  tags?: string[];
  /** Maximum results to return */
  limit?: number;
}

/**
 * Search result with relevance scoring
 */
export interface PromptSearchResult {
  /** The matching prompt template */
  template: PromptTemplate;
  /** Relevance score (0-1) */
  score: number;
  /** Matched keywords (for highlighting) */
  matchedKeywords: string[];
}

/**
 * Rendered prompt ready for API submission
 */
export interface RenderedPrompt {
  /** System prompt (if applicable) */
  system?: string;
  /** User/main prompt */
  user: string;
  /** Metadata about the rendering */
  meta: {
    templateId: string;
    templateVersion: string;
    renderedAt: string;
    variables: Record<string, unknown>;
  };
}

/**
 * Nano Banana specific image generation options
 */
export interface NanoBananaImageOptions {
  /** Style preset */
  style: 'cinematic' | 'photorealistic' | 'illustration' | 'abstract' | 'product';
  /** Aspect ratio */
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:3';
  /** Lighting style */
  lighting?: 'natural' | 'studio' | 'dramatic' | 'soft' | 'neon';
  /** Camera angle */
  cameraAngle?: 'eye-level' | 'low-angle' | 'high-angle' | 'dutch' | 'overhead';
  /** Color palette */
  colorPalette?: 'vibrant' | 'muted' | 'monochrome' | 'warm' | 'cool';
  /** Negative prompt (what to avoid) */
  negativePrompt?: string;
}

/**
 * Image generation prompt with Nano Banana options
 */
export interface ImageGenerationPrompt extends PromptTemplate {
  category: 'image-generation';
  /** Default options for this template */
  defaultOptions: NanoBananaImageOptions;
  /** Quality presets */
  qualityPresets?: Record<string, Partial<NanoBananaImageOptions>>;
}
