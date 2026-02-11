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
  {
    id: 'openai',
    displayName: 'OpenAI',
    envVarNames: ['OPENAI_API_KEY'],
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    envVarNames: ['ANTHROPIC_API_KEY'],
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  {
    id: 'gemini',
    displayName: 'Google Gemini',
    envVarNames: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
    defaultModel: 'gemini-2.0-flash',
  },
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

export const ENVIRONMENT_VARIABLES = [
  { name: 'OPENAI_API_KEY', required: true },
  { name: 'ANTHROPIC_API_KEY', required: false },
  { name: 'PEXELS_API_KEY', required: false },
  { name: 'PIXABAY_API_KEY', required: false },
  { name: 'GOOGLE_API_KEY', required: false },
  { name: 'GEMINI_API_KEY', required: false },
  { name: 'REDDIT_CLIENT_ID', required: false },
  { name: 'REDDIT_CLIENT_SECRET', required: false },
  { name: 'OUTPUT_DIR', required: false },
  { name: 'REDIS_URL', required: false },
  { name: 'TAVILY_API_KEY', required: false },
  { name: 'BRAVE_SEARCH_API_KEY', required: false },
] as const;
export type RepoEnvironmentVariable = (typeof ENVIRONMENT_VARIABLES)[number];

export const SYNC_PRESET_CONFIGS = {
  fast: {
    pipeline: 'standard',
    reconcile: false,
    syncQualityCheck: false,
    minSyncRating: 0,
    autoRetrySync: false,
  },
  standard: {
    pipeline: 'audio-first',
    reconcile: true,
    syncQualityCheck: false,
    minSyncRating: 60,
    autoRetrySync: false,
  },
  quality: {
    pipeline: 'audio-first',
    reconcile: true,
    syncQualityCheck: true,
    minSyncRating: 75,
    autoRetrySync: false,
  },
  maximum: {
    pipeline: 'audio-first',
    reconcile: true,
    syncQualityCheck: true,
    minSyncRating: 85,
    autoRetrySync: true,
  },
} as const;
export type SyncPresetId = keyof typeof SYNC_PRESET_CONFIGS;
export const SYNC_PRESET_IDS = Object.keys(SYNC_PRESET_CONFIGS) as SyncPresetId[];

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
