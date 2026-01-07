/**
 * LLM Cost Calculator
 *
 * Centralized cost estimation for LLM API calls.
 * Extracted to avoid duplication across generators.
 */

/**
 * Cost per 1M tokens for known models (input cost approximation)
 */
const MODEL_COSTS: Record<string, number> = {
  // OpenAI
  'gpt-4o': 5,
  'gpt-4o-mini': 0.15,
  'gpt-3.5-turbo': 0.5,
  'gpt-4-turbo': 10,
  'gpt-4': 30,
  // Anthropic
  'claude-3-5-sonnet-20241022': 3,
  'claude-3-sonnet-20240229': 3,
  'claude-3-haiku-20240307': 0.25,
  'claude-3-opus-20240229': 15,
  // Google Gemini
  'gemini-1.5-flash': 0.075, // $0.075 per 1M input tokens
  'gemini-1.5-flash-8b': 0.0375,
  'gemini-1.5-pro': 1.25,
  'gemini-2.0-flash': 0.1,
  'gemini-pro': 0.5,
};

/**
 * Default cost per 1M tokens when model is unknown
 */
const DEFAULT_COST_PER_1M = 5;

/**
 * Calculate approximate LLM cost based on token count and model
 *
 * @param tokens - Number of tokens used
 * @param model - Model identifier (e.g., 'gpt-4o-mini')
 * @returns Estimated cost in USD
 */
export function calculateLLMCost(tokens: number, model: string): number {
  const costPer1M = MODEL_COSTS[model] ?? DEFAULT_COST_PER_1M;
  return (tokens / 1_000_000) * costPer1M;
}

/**
 * Get the cost per 1M tokens for a model
 *
 * @param model - Model identifier
 * @returns Cost per 1M tokens in USD
 */
export function getModelCost(model: string): number {
  return MODEL_COSTS[model] ?? DEFAULT_COST_PER_1M;
}

/**
 * Check if a model has known pricing
 */
export function hasKnownPricing(model: string): boolean {
  return model in MODEL_COSTS;
}
