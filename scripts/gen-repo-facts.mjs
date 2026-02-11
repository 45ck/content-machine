import fs from 'node:fs';
import path from 'node:path';
import { readRepoFactsRegistry } from './lib/repo-facts.mjs';

const RepoRoot = process.cwd();

function mdList(items) {
  if (!items || items.length === 0) return '';
  return items.map((x) => `- ${x}`).join('\n');
}

function mdProviderLines(providers) {
  const lines = [];
  for (const p of providers ?? []) {
    const env = (p.envVarNames ?? []).map((x) => `\`${x}\``).join(', ');
    const notes = p.notes ? ` ${p.notes.trim()}` : '';
    lines.push(`- ${p.displayName} (id: \`${p.id}\`)`);
    if (env) lines.push(`  - Env vars: ${env}${notes ? `.${notes}` : ''}`);
    else if (notes) lines.push(`  - Notes: ${notes}`);
  }
  return lines.join('\n');
}

function generateRepoFactsMd({ registry }) {
  const f = registry.facts;
  const visualsById = new Map((f.visuals.supportedProviders ?? []).map((p) => [p.id, p]));
  const stockProviders = (f.stockVisuals.providerIds ?? [])
    .map((id) => visualsById.get(id))
    .filter(Boolean);
  const lines = [];
  lines.push('# Repository Facts');
  lines.push('');
  lines.push('> DO NOT EDIT: generated from `registry/repo-facts.yaml`.');
  lines.push('');
  lines.push('See also (generated):');
  lines.push('- `docs/reference/ARTIFACT-CONTRACTS.md`');
  lines.push('- `docs/reference/CONFIG-SURFACE.md`');
  lines.push('- `docs/reference/QUALITY-GATES.md`');
  lines.push('- `docs/reference/SECURITY-INVARIANTS.md`');
  lines.push('- `docs/reference/CLI-CONTRACT.md`');
  lines.push('- `docs/reference/PIPELINE-PRESETS.md`');
  lines.push('');
  lines.push('## Runtime');
  lines.push(`- Node: ${f.runtime.node.supported}`);
  lines.push(`- Package manager: ${f.runtime.node.packageManager}`);
  lines.push(`- Primary language: ${f.runtime.language.primary}`);
  lines.push('');
  lines.push('## LLM Providers');
  lines.push(mdProviderLines(f.llm.supportedProviders));
  lines.push('');
  lines.push('Default:');
  lines.push(`- provider: \`${f.llm.default.providerId}\``);
  lines.push(`- model: \`${f.llm.default.model}\``);
  lines.push(`- temperature: \`${String(f.llm.default.temperature)}\``);
  lines.push('');
  lines.push('## Stock Visuals Providers');
  if (stockProviders.length === 0) lines.push('- (none)');
  else lines.push(mdProviderLines(stockProviders));
  lines.push('');

  lines.push('## Visuals Providers');
  if ((f.visuals.supportedProviders ?? []).length === 0) lines.push('- (none)');
  else lines.push(mdProviderLines(f.visuals.supportedProviders));
  lines.push('');
  lines.push('## Spellcheck');
  lines.push(`- CSpell config: \`${f.spellcheck.cspell.configPath}\``);
  lines.push('');
  if ((f.spellcheck.cspell.generatedDictionaries ?? []).length > 0) {
    lines.push('Generated dictionaries:');
    lines.push(
      mdList(f.spellcheck.cspell.generatedDictionaries.map((d) => `\`${d.name}\` -> \`${d.path}\``))
    );
    lines.push('');
  }
  if ((f.spellcheck.cspell.manualDictionaries ?? []).length > 0) {
    lines.push('Manual dictionaries:');
    lines.push(
      mdList(f.spellcheck.cspell.manualDictionaries.map((d) => `\`${d.name}\` -> \`${d.path}\``))
    );
    lines.push('');
  }

  lines.push('');
  return lines.join('\n');
}

function generateArtifactContractsMd({ registry }) {
  const lines = [];
  lines.push('# Artifact Contracts');
  lines.push('');
  lines.push('> DO NOT EDIT: generated from `registry/repo-facts.yaml`.');
  lines.push('');
  lines.push('These are the canonical stage contracts (filenames are conventional defaults).');
  lines.push('');
  for (const a of registry.artifacts ?? []) {
    lines.push(`## ${a.id}`);
    lines.push('');
    lines.push(`- Stage: \`${a.stage}\``);
    lines.push(`- Default filename: \`${a.defaultFilename}\``);
    lines.push(`- Description: ${a.description.trim()}`);
    lines.push('');
  }
  lines.push('');
  return lines.join('\n');
}

function generateConfigSurfaceMd({ registry }) {
  const cs = registry.configSurface;
  const lines = [];
  lines.push('# Config Surface');
  lines.push('');
  lines.push('> DO NOT EDIT: generated from `registry/repo-facts.yaml`.');
  lines.push('');
  lines.push('## Files & Locations');
  lines.push('');
  for (const f of cs.files ?? []) {
    lines.push(`## ${f.id}`);
    lines.push('');
    lines.push(`- Path: \`${f.path}\``);
    lines.push(`- Secrets: \`${String(Boolean(f.secrets))}\``);
    lines.push(`- Purpose: ${f.purpose.trim()}`);
    lines.push('');
  }
  if ((cs.precedence ?? []).length > 0) {
    lines.push('## Precedence');
    lines.push('');
    lines.push(mdList((cs.precedence ?? []).map((x) => `\`${x}\``)));
    lines.push('');
  }
  if ((cs.projectConfigCandidates ?? []).length > 0) {
    lines.push('## Project Config Candidates');
    lines.push('');
    lines.push(mdList((cs.projectConfigCandidates ?? []).map((x) => `\`${x}\``)));
    lines.push('');
  }
  if ((cs.userConfigCandidates ?? []).length > 0) {
    lines.push('## User Config Candidates (under home directory)');
    lines.push('');
    lines.push(mdList((cs.userConfigCandidates ?? []).map((x) => `\`${x}\``)));
    lines.push('');
  }
  lines.push('');
  return lines.join('\n');
}

function generateQualityGatesMd({ registry }) {
  const q = registry.quality;
  const lines = [];
  lines.push('# Quality Gates');
  lines.push('');
  lines.push('> DO NOT EDIT: generated from `registry/repo-facts.yaml`.');
  lines.push('');
  lines.push('These checks must remain wired in CI and are expected to be runnable locally.');
  lines.push('');
  if ((q.requiredNpmScripts ?? []).length > 0) {
    lines.push('Required npm scripts:');
    lines.push('');
    lines.push(mdList((q.requiredNpmScripts ?? []).map((s) => `\`npm run ${s}\``)));
    lines.push('');
  }
  lines.push(`CI workflow: \`${q.ci.workflowPath}\``);
  lines.push('');
  lines.push('');
  return lines.join('\n');
}

function generateSecurityInvariantsMd({ registry }) {
  const s = registry.security;
  const lines = [];
  lines.push('# Security Invariants');
  lines.push('');
  lines.push('> DO NOT EDIT: generated from `registry/repo-facts.yaml`.');
  lines.push('');
  if ((s.invariants ?? []).length > 0) {
    lines.push('Invariants:');
    lines.push('');
    lines.push(mdList(s.invariants));
    lines.push('');
  }
  lines.push('');
  return lines.join('\n');
}

function generateCliContractMd({ registry }) {
  const c = registry.cli?.errorContract;
  const lines = [];
  lines.push('# CLI Contract');
  lines.push('');
  lines.push('> DO NOT EDIT: generated from `registry/repo-facts.yaml`.');
  lines.push('');
  lines.push('## Errors');
  lines.push('');
  lines.push(`- Error prefix: \`${c.errorPrefix}\``);
  lines.push(`- Fix prefix: \`${c.fixPrefix}\``);
  if (c.note) lines.push(`- Note: ${c.note.trim()}`);
  lines.push('');
  lines.push('');
  return lines.join('\n');
}

function generatePipelinePresetsMd({ registry }) {
  const p = registry.pipelinePresets;
  const lines = [];
  lines.push('# Pipeline Presets');
  lines.push('');
  lines.push('> DO NOT EDIT: generated from `registry/repo-facts.yaml`.');
  lines.push('');
  lines.push('These preset ids are intended to stay stable (even if implementation evolves).');
  lines.push('');
  lines.push('## Sync Presets');
  lines.push('');
  if ((p.sync?.presets ?? []).length === 0) lines.push('- (none)');
  else {
    for (const pr of p.sync.presets) {
      lines.push(`- \`${pr.id}\`: ${pr.description.trim()}`);
    }
  }
  lines.push('');
  lines.push('');
  return lines.join('\n');
}

function generateCopilotInstructionsMd({ registry }) {
  const f = registry.facts;
  const lines = [];
  lines.push('# Repository instructions (generated)');
  lines.push('');
  lines.push(`This repository is \`${registry.meta.repoName}\`.`);
  lines.push('');
  lines.push('## Canonical sources of truth');
  lines.push('- Repo facts: `registry/repo-facts.yaml`');
  lines.push('- Ubiquitous language: `registry/ubiquitous-language.yaml`');
  lines.push('- Artifact contracts: `docs/reference/ARTIFACT-CONTRACTS.md`');
  lines.push('- Config surface: `docs/reference/CONFIG-SURFACE.md`');
  lines.push('- CLI contract: `docs/reference/CLI-CONTRACT.md`');
  lines.push('');
  lines.push('## Build & quality');
  lines.push('- Install: `npm ci`');
  lines.push('- Quality gates: `npm run quality`');
  lines.push('- Tests: `npm run test:run`');
  lines.push('');
  lines.push('## Providers');
  lines.push('Supported LLM providers:');
  lines.push(mdProviderLines(f.llm.supportedProviders));
  lines.push('');
  lines.push('Default LLM:');
  lines.push(`- provider: \`${f.llm.default.providerId}\``);
  lines.push(`- model: \`${f.llm.default.model}\``);
  lines.push('');
  lines.push('');
  return lines.join('\n');
}

function generateClaudeMd({ registry }) {
  const f = registry.facts;
  const lines = [];
  lines.push('# Claude Code project guidance (generated)');
  lines.push('');
  lines.push('See `AGENTS.md` for agent/dev workflow and `docs/README.md` for doc structure.');
  lines.push('');
  lines.push('## Repository facts (canonical)');
  lines.push(`- Node: ${f.runtime.node.supported}`);
  lines.push(`- Primary language: ${f.runtime.language.primary}`);
  lines.push(
    `- Default LLM provider: \`${f.llm.default.providerId}\` (model: \`${f.llm.default.model}\`)`
  );
  lines.push('');
  lines.push('## Security');
  lines.push('- Never print or log secret values.');
  lines.push('- Only refer to secrets by env var name (example: `OPENAI_API_KEY`).');
  lines.push('');
  lines.push('## Glossary');
  lines.push('Use canonical terms from `registry/ubiquitous-language.yaml`.');
  lines.push('');
  lines.push('');
  return lines.join('\n');
}

function tsString(s) {
  return JSON.stringify(String(s));
}

function generateRepoFactsTs({ registry }) {
  const f = registry.facts;
  const llmProviderIds = (f.llm.supportedProviders ?? []).map((p) => p.id);
  const stockProviderIds = [...(f.stockVisuals.providerIds ?? [])];
  const visualsProviderIds = (f.visuals.supportedProviders ?? []).map((p) => p.id);
  const artifactFiles = {};
  for (const a of registry.artifacts ?? []) artifactFiles[a.id] = a.defaultFilename;
  const configSurfaceFiles = {};
  for (const cf of registry.configSurface?.files ?? []) configSurfaceFiles[cf.id] = cf.path;
  const llmProviders = (f.llm.supportedProviders ?? []).map((p) => ({
    id: p.id,
    displayName: p.displayName,
    envVarNames: [...(p.envVarNames ?? [])],
  }));
  const visualsById = new Map((f.visuals.supportedProviders ?? []).map((p) => [p.id, p]));
  const stockVisualsProviders = stockProviderIds
    .map((id) => visualsById.get(id))
    .filter(Boolean)
    .map((p) => ({
    id: p.id,
    displayName: p.displayName,
    envVarNames: [...(p.envVarNames ?? [])],
  }));
  const visualsProviders = (f.visuals.supportedProviders ?? []).map((p) => ({
    id: p.id,
    displayName: p.displayName,
    envVarNames: [...(p.envVarNames ?? [])],
  }));

  const lines = [];
  lines.push('/*');
  lines.push(' * DO NOT EDIT: generated from registry/repo-facts.yaml');
  lines.push(' * Run: npm run repo-facts:gen');
  lines.push(' */');
  lines.push('');

  lines.push(
    `export const SUPPORTED_LLM_PROVIDER_IDS = ${JSON.stringify(llmProviderIds)} as const;`
  );
  lines.push('export type RepoFactsLlmProviderId = (typeof SUPPORTED_LLM_PROVIDER_IDS)[number];');
  lines.push('');
  lines.push(
    `export const SUPPORTED_STOCK_VISUALS_PROVIDER_IDS = ${JSON.stringify(stockProviderIds)} as const;`
  );
  lines.push(
    'export type RepoFactsStockVisualsProviderId = (typeof SUPPORTED_STOCK_VISUALS_PROVIDER_IDS)[number];'
  );
  lines.push('');

  lines.push(
    `export const SUPPORTED_VISUALS_PROVIDER_IDS = ${JSON.stringify(visualsProviderIds)} as const;`
  );
  lines.push(
    'export type RepoFactsVisualsProviderId = (typeof SUPPORTED_VISUALS_PROVIDER_IDS)[number];'
  );
  lines.push('');

  lines.push(
    `export const DEFAULT_ARTIFACT_FILENAMES = ${JSON.stringify(artifactFiles)} as const;`
  );
  lines.push('export type ArtifactId = keyof typeof DEFAULT_ARTIFACT_FILENAMES;');
  lines.push('');

  lines.push(`export const CONFIG_SURFACE_FILES = ${JSON.stringify(configSurfaceFiles)} as const;`);
  lines.push('export type ConfigSurfaceFileId = keyof typeof CONFIG_SURFACE_FILES;');
  lines.push('');
  lines.push(
    `export const PROJECT_CONFIG_CANDIDATES = ${JSON.stringify(registry.configSurface?.projectConfigCandidates ?? [])} as const;`
  );
  lines.push(
    'export type ProjectConfigCandidate = (typeof PROJECT_CONFIG_CANDIDATES)[number];'
  );
  lines.push('');
  lines.push(
    `export const USER_CONFIG_CANDIDATES = ${JSON.stringify(registry.configSurface?.userConfigCandidates ?? [])} as const;`
  );
  lines.push('export type UserConfigCandidate = (typeof USER_CONFIG_CANDIDATES)[number];');
  lines.push('');

  lines.push(`export const LLM_PROVIDERS = ${JSON.stringify(llmProviders)} as const;`);
  lines.push('export type LlmProviderFacts = (typeof LLM_PROVIDERS)[number];');
  lines.push('');
  lines.push(
    `export const STOCK_VISUALS_PROVIDERS = ${JSON.stringify(stockVisualsProviders)} as const;`
  );
  lines.push('export type StockVisualsProviderFacts = (typeof STOCK_VISUALS_PROVIDERS)[number];');
  lines.push('');

  lines.push(`export const VISUALS_PROVIDERS = ${JSON.stringify(visualsProviders)} as const;`);
  lines.push('export type VisualsProviderFacts = (typeof VISUALS_PROVIDERS)[number];');
  lines.push('');

  lines.push('export const CLI_ERROR_CONTRACT = {');
  lines.push(`  errorPrefix: ${tsString(registry.cli.errorContract.errorPrefix)},`);
  lines.push(`  fixPrefix: ${tsString(registry.cli.errorContract.fixPrefix)},`);
  lines.push('} as const;');
  lines.push('');

  // Keep the object minimal but stable for runtime imports.
  lines.push('export const REPO_FACTS = {');
  lines.push('  runtime: {');
  lines.push('    node: {');
  lines.push(`      supported: ${tsString(f.runtime.node.supported)},`);
  lines.push(`      packageManager: ${tsString(f.runtime.node.packageManager)},`);
  lines.push('    },');
  lines.push('    language: {');
  lines.push(`      primary: ${tsString(f.runtime.language.primary)},`);
  lines.push('    },');
  lines.push('  },');
  lines.push('  llm: {');
  lines.push('    default: {');
  lines.push(`      providerId: ${tsString(f.llm.default.providerId)},`);
  lines.push(`      model: ${tsString(f.llm.default.model)},`);
  lines.push(`      temperature: ${String(f.llm.default.temperature)},`);
  lines.push('    },');
  lines.push('  },');
  lines.push('} as const;');
  lines.push('');
  return lines.join('\n');
}

function stableUniqueSorted(items) {
  const out = Array.from(new Set(items.filter(Boolean)));
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function isProbablyWord(s) {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(s);
}

function extractCspellWords({ registry }) {
  const f = registry.facts;
  const words = [];
  for (const p of f.llm.supportedProviders ?? []) {
    words.push(p.id);
    for (const v of p.envVarNames ?? []) words.push(v);
    const dnParts = String(p.displayName)
      .split(/[^A-Za-z0-9_-]+/g)
      .map((x) => x.trim())
      .filter(Boolean);
    for (const part of dnParts) words.push(part);
  }

  for (const p of f.visuals.supportedProviders ?? []) {
    words.push(p.id);
    for (const v of p.envVarNames ?? []) words.push(v);
    const dnParts = String(p.displayName)
      .split(/[^A-Za-z0-9_-]+/g)
      .map((x) => x.trim())
      .filter(Boolean);
    for (const part of dnParts) words.push(part);
  }

  for (const ev of f.environment.variables ?? []) {
    words.push(ev.name);
  }

  // Include the default model token(s) if they are cspell-friendly.
  words.push(String(f.llm.default.model));

  return stableUniqueSorted(words).filter(isProbablyWord);
}

function renderDictionary(words) {
  const lines = [];
  lines.push('# DO NOT EDIT: generated from registry/repo-facts.yaml.');
  lines.push('# Update the registry, then run: npm run repo-facts:gen');
  lines.push('');
  for (const w of words) lines.push(w);
  lines.push('');
  return lines.join('\n');
}

async function formatWithPrettier(code, outPath, parser) {
  try {
    const mod = await import('prettier');
    const prettier = mod.default ?? mod;
    const config = (await prettier.resolveConfig(outPath)) ?? {};
    return await prettier.format(code, { ...config, parser });
  } catch {
    return code.endsWith('\n') ? code : `${code}\n`;
  }
}

async function main() {
  const { registry } = readRepoFactsRegistry({ repoRoot: RepoRoot });

  const outRepoFactsMd = path.join(RepoRoot, 'docs', 'reference', 'REPO-FACTS.md');
  const outArtifactsMd = path.join(RepoRoot, 'docs', 'reference', 'ARTIFACT-CONTRACTS.md');
  const outConfigMd = path.join(RepoRoot, 'docs', 'reference', 'CONFIG-SURFACE.md');
  const outQualityMd = path.join(RepoRoot, 'docs', 'reference', 'QUALITY-GATES.md');
  const outSecurityMd = path.join(RepoRoot, 'docs', 'reference', 'SECURITY-INVARIANTS.md');
  const outCliMd = path.join(RepoRoot, 'docs', 'reference', 'CLI-CONTRACT.md');
  const outPresetsMd = path.join(RepoRoot, 'docs', 'reference', 'PIPELINE-PRESETS.md');
  const outCopilotMd = path.join(RepoRoot, '.github', 'copilot-instructions.md');
  const outClaudeMd = path.join(RepoRoot, 'CLAUDE.md');
  const outTs = path.join(RepoRoot, 'src', 'domain', 'repo-facts.generated.ts');
  const outCspell = path.join(RepoRoot, 'config', 'cspell', 'repo-facts.txt');

  const repoFactsMd = await formatWithPrettier(
    generateRepoFactsMd({ registry }),
    outRepoFactsMd,
    'markdown'
  );
  const artifactsMd = await formatWithPrettier(
    generateArtifactContractsMd({ registry }),
    outArtifactsMd,
    'markdown'
  );
  const configMd = await formatWithPrettier(
    generateConfigSurfaceMd({ registry }),
    outConfigMd,
    'markdown'
  );
  const qualityMd = await formatWithPrettier(
    generateQualityGatesMd({ registry }),
    outQualityMd,
    'markdown'
  );
  const securityMd = await formatWithPrettier(
    generateSecurityInvariantsMd({ registry }),
    outSecurityMd,
    'markdown'
  );
  const cliMd = await formatWithPrettier(generateCliContractMd({ registry }), outCliMd, 'markdown');
  const presetsMd = await formatWithPrettier(
    generatePipelinePresetsMd({ registry }),
    outPresetsMd,
    'markdown'
  );
  const copilotMd = await formatWithPrettier(
    generateCopilotInstructionsMd({ registry }),
    outCopilotMd,
    'markdown'
  );
  const claudeMd = await formatWithPrettier(
    generateClaudeMd({ registry }),
    outClaudeMd,
    'markdown'
  );
  const tsCode = await formatWithPrettier(generateRepoFactsTs({ registry }), outTs, 'typescript');
  const cspellWords = extractCspellWords({ registry });

  fs.mkdirSync(path.dirname(outRepoFactsMd), { recursive: true });
  fs.mkdirSync(path.dirname(outCopilotMd), { recursive: true });
  fs.mkdirSync(path.dirname(outTs), { recursive: true });
  fs.mkdirSync(path.dirname(outCspell), { recursive: true });

  fs.writeFileSync(outRepoFactsMd, repoFactsMd, 'utf8');
  fs.writeFileSync(outArtifactsMd, artifactsMd, 'utf8');
  fs.writeFileSync(outConfigMd, configMd, 'utf8');
  fs.writeFileSync(outQualityMd, qualityMd, 'utf8');
  fs.writeFileSync(outSecurityMd, securityMd, 'utf8');
  fs.writeFileSync(outCliMd, cliMd, 'utf8');
  fs.writeFileSync(outPresetsMd, presetsMd, 'utf8');
  fs.writeFileSync(outCopilotMd, copilotMd, 'utf8');
  fs.writeFileSync(outClaudeMd, claudeMd, 'utf8');
  fs.writeFileSync(outTs, tsCode, 'utf8');
  fs.writeFileSync(outCspell, renderDictionary(cspellWords), 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
