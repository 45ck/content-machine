/*
 * DO NOT EDIT: generated from registry/repo-facts.yaml
 * Run: npm run repo-facts:gen
 */

export const SUPPORTED_LLM_PROVIDER_IDS = ['openai', 'anthropic', 'gemini'] as const;
export type RepoFactsLlmProviderId = (typeof SUPPORTED_LLM_PROVIDER_IDS)[number];

export const SUPPORTED_STOCK_VISUALS_PROVIDER_IDS = ['pexels', 'pixabay'] as const;
export type RepoFactsStockVisualsProviderId = (typeof SUPPORTED_STOCK_VISUALS_PROVIDER_IDS)[number];

export const SUPPORTED_VISUALS_PROVIDER_IDS = [
  'pexels',
  'nanobanana',
  'local',
  'localimage',
  'pixabay',
] as const;
export type RepoFactsVisualsProviderId = (typeof SUPPORTED_VISUALS_PROVIDER_IDS)[number];

export const DEFAULT_ARTIFACT_FILENAMES = {
  script: 'script.json',
  audio: 'audio.wav',
  timestamps: 'timestamps.json',
  'audio-mix': 'audio.mix.json',
  visuals: 'visuals.json',
  video: 'video.mp4',
} as const;
export type ArtifactId = keyof typeof DEFAULT_ARTIFACT_FILENAMES;

export const CONFIG_SURFACE_FILES = {
  dotenv: '.env',
  'dotenv-example': '.env.example',
  'project-config': '.content-machine.toml',
  'project-data': './.cm/',
  'user-data': '~/.cm/',
  'output-dir': './output/',
} as const;
export type ConfigSurfaceFileId = keyof typeof CONFIG_SURFACE_FILES;

export const PROJECT_CONFIG_CANDIDATES = [
  '.content-machine.toml',
  'content-machine.toml',
  '.cmrc.json',
] as const;
export type ProjectConfigCandidate = (typeof PROJECT_CONFIG_CANDIDATES)[number];

export const USER_CONFIG_CANDIDATES = ['.cm/config.toml', '.cm/config.json', '.cmrc.json'] as const;
export type UserConfigCandidate = (typeof USER_CONFIG_CANDIDATES)[number];

export const LLM_PROVIDERS = [
  { id: 'openai', displayName: 'OpenAI', envVarNames: ['OPENAI_API_KEY'] },
  { id: 'anthropic', displayName: 'Anthropic', envVarNames: ['ANTHROPIC_API_KEY'] },
  { id: 'gemini', displayName: 'Google Gemini', envVarNames: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'] },
] as const;
export type LlmProviderFacts = (typeof LLM_PROVIDERS)[number];

export const STOCK_VISUALS_PROVIDERS = [
  { id: 'pexels', displayName: 'Pexels', envVarNames: ['PEXELS_API_KEY'] },
  { id: 'pixabay', displayName: 'Pixabay', envVarNames: ['PIXABAY_API_KEY'] },
] as const;
export type StockVisualsProviderFacts = (typeof STOCK_VISUALS_PROVIDERS)[number];

export const VISUALS_PROVIDERS = [
  { id: 'pexels', displayName: 'Pexels', envVarNames: ['PEXELS_API_KEY'] },
  {
    id: 'nanobanana',
    displayName: 'NanoBanana (Gemini Images)',
    envVarNames: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
  },
  { id: 'local', displayName: 'Local Clips', envVarNames: [] },
  { id: 'localimage', displayName: 'Local Images', envVarNames: [] },
  { id: 'pixabay', displayName: 'Pixabay', envVarNames: ['PIXABAY_API_KEY'] },
] as const;
export type VisualsProviderFacts = (typeof VISUALS_PROVIDERS)[number];

export const CLI_ERROR_CONTRACT = {
  errorPrefix: 'ERROR:',
  fixPrefix: 'Fix:',
} as const;

export const REPO_FACTS = {
  runtime: {
    node: {
      supported: '>=20',
      packageManager: 'npm',
    },
    language: {
      primary: 'TypeScript',
    },
  },
  llm: {
    default: {
      providerId: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
    },
  },
} as const;
