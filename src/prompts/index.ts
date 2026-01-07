/**
 * Prompt Library
 *
 * Curated prompts for content-machine video generation.
 * Includes prompts adapted from open-source projects (with attribution)
 * and original prompts for Nano Banana / AI image generation.
 *
 * @example
 * ```typescript
 * import { getPrompt, searchPrompts, renderPrompt } from './prompts';
 *
 * // Get a specific prompt
 * const template = getPrompt('script/video-script-generator');
 *
 * // Search prompts
 * const results = searchPrompts('image generation', { category: 'image-generation' });
 *
 * // Render a prompt with variables
 * const rendered = renderPrompt(template, { topic: 'Redis vs PostgreSQL' });
 * ```
 */

// Types
export type {
  PromptTemplate,
  PromptCategory,
  PromptProvider,
  PromptOutputFormat,
  PromptVariable,
  PromptExample,
  PromptSource,
  PromptSearchOptions,
  PromptSearchResult,
  RenderedPrompt,
  NanoBananaImageOptions,
  ImageGenerationPrompt,
} from './types';

// Registry and functions
export {
  PromptRegistry,
  getPrompt,
  searchPrompts,
  renderPrompt,
  listCategories,
  listProviders,
} from './registry';

/**
 * Prompt template IDs for easy reference
 */
export const PROMPT_IDS = {
  // Script generation
  SCRIPT_VIDEO_GENERATOR: 'script/video-script-generator',
  SCRIPT_FACTS_GENERATOR: 'script/facts-generator',

  // Visual search
  VISUALS_VIDEO_SEARCH: 'visuals/video-search-terms',
  VISUALS_IMAGE_QUERY: 'visuals/image-query-generator',

  // Image generation (Nano Banana)
  IMAGE_CINEMATIC_SCENE: 'image-generation/cinematic-scene',
  IMAGE_TECH_VISUALIZATION: 'image-generation/tech-visualization',
  IMAGE_COMPARISON_SPLIT: 'image-generation/comparison-split',
  IMAGE_PERSON_ACTION: 'image-generation/person-action',
  IMAGE_ABSTRACT_CONCEPT: 'image-generation/abstract-concept',
} as const;

/**
 * Quick access to image generation prompts for Nano Banana
 */
export const NANO_BANANA_PROMPTS = {
  cinematic: PROMPT_IDS.IMAGE_CINEMATIC_SCENE,
  tech: PROMPT_IDS.IMAGE_TECH_VISUALIZATION,
  comparison: PROMPT_IDS.IMAGE_COMPARISON_SPLIT,
  person: PROMPT_IDS.IMAGE_PERSON_ACTION,
  abstract: PROMPT_IDS.IMAGE_ABSTRACT_CONCEPT,
} as const;
