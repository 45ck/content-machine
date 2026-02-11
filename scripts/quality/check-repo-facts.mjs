import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readRepoFactsRegistry } from '../lib/repo-facts.mjs';

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trimEnd();
}

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function readTextIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function extractEnvVarNamesFromDotEnvExample(dotEnvExampleContent) {
  const out = new Set();
  for (const line of String(dotEnvExampleContent).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)\s*=/);
    if (m?.[1]) out.add(m[1]);
  }
  return out;
}

function extractProcessEnvVarNames(sourceText) {
  const out = new Set();
  const regex = /process\.env\.([A-Z0-9_]+)/g;
  let match = regex.exec(sourceText);
  while (match) {
    if (match[1]) out.add(match[1]);
    match = regex.exec(sourceText);
  }
  return out;
}

function listFilesRecursive(rootDir, includeExtensions) {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
        continue;
      }
      const ext = path.extname(ent.name).toLowerCase();
      if (includeExtensions.has(ext)) out.push(full);
    }
  }
  return out;
}

function isUndatedException(relPath, undatedGlobs) {
  // Minimal glob support for patterns used in repo-facts.yaml:
  // - exact paths
  // - prefix/** patterns
  for (const g of undatedGlobs ?? []) {
    const glob = String(g);
    if (!glob) continue;
    if (glob.endsWith('/**')) {
      const prefix = glob.slice(0, -3);
      if (relPath === prefix || relPath.startsWith(prefix + '/')) return true;
      continue;
    }
    if (relPath === glob) return true;
  }
  return false;
}

function hasDateSuffix(filename) {
  // Something-like-YYYYMMDD.ext
  return /-\d{8}\.[^.]+$/.test(filename);
}

function main() {
  const repoRoot = process.cwd();
  const registryPath = path.join(repoRoot, 'registry', 'repo-facts.yaml');
  const dotEnvExamplePath = path.join(repoRoot, '.env.example');

  const outRepoFactsMd = path.join(repoRoot, 'docs', 'reference', 'REPO-FACTS.md');
  const outArtifactsMd = path.join(repoRoot, 'docs', 'reference', 'ARTIFACT-CONTRACTS.md');
  const outConfigMd = path.join(repoRoot, 'docs', 'reference', 'CONFIG-SURFACE.md');
  const outQualityMd = path.join(repoRoot, 'docs', 'reference', 'QUALITY-GATES.md');
  const outSecurityMd = path.join(repoRoot, 'docs', 'reference', 'SECURITY-INVARIANTS.md');
  const outCliMd = path.join(repoRoot, 'docs', 'reference', 'CLI-CONTRACT.md');
  const outPresetsMd = path.join(repoRoot, 'docs', 'reference', 'PIPELINE-PRESETS.md');
  const outCopilotMd = path.join(repoRoot, '.github', 'copilot-instructions.md');
  const outClaudeMd = path.join(repoRoot, 'CLAUDE.md');
  const outTs = path.join(repoRoot, 'src', 'domain', 'repo-facts.generated.ts');
  const outCspell = path.join(repoRoot, 'config', 'cspell', 'repo-facts.txt');

  const outputs = [
    outRepoFactsMd,
    outArtifactsMd,
    outConfigMd,
    outQualityMd,
    outSecurityMd,
    outCliMd,
    outPresetsMd,
    outCopilotMd,
    outTs,
    outCspell,
  ];

  // CLAUDE.md is often intentionally gitignored in this repo. Treat it as optional:
  // validate idempotency when present, but do not require it to exist in clean archives.
  if (fileExists(outClaudeMd)) outputs.push(outClaudeMd);

  const errors = [];
  if (!fileExists(registryPath)) errors.push(`Missing registry: ${registryPath}`);
  if (!fileExists(dotEnvExamplePath)) errors.push(`Missing .env.example: ${dotEnvExamplePath}`);
  for (const p of outputs) {
    if (!fileExists(p)) errors.push(`Missing generated output: ${p}`);
  }
  if (errors.length > 0) {
    console.error('Repo facts checks failed:');
    for (const e of errors) console.error(`- ${e}`);
    console.error('Fix: run `npm run repo-facts:gen` and commit generated outputs.');
    process.exit(1);
  }

  // Ensure provider env var names are documented in .env.example.
  //
  // Note: .env.example may contain additional vars not in repo-facts.yaml (that's fine).
  const { registry } = readRepoFactsRegistry({ repoRoot });
  const envExample = fs.readFileSync(dotEnvExamplePath, 'utf8');
  const envNamesInExample = extractEnvVarNamesFromDotEnvExample(envExample);
  const expected = [];
  for (const p of registry.facts.llm.supportedProviders ?? []) {
    for (const v of p.envVarNames ?? []) expected.push(String(v));
  }
  for (const p of registry.facts.visuals.supportedProviders ?? []) {
    for (const v of p.envVarNames ?? []) expected.push(String(v));
  }
  for (const e of registry.facts.environment.variables ?? []) {
    expected.push(String(e.name));
  }
  for (const v of expected) {
    if (!envNamesInExample.has(v)) {
      console.error(`Repo facts check failed: .env.example missing env var: ${v}`);
      console.error('Fix: add it to .env.example (or remove it from registry/repo-facts.yaml).');
      process.exit(1);
    }
  }

  // Reverse guard: env vars referenced as process.env.* in code/tests/scripts must
  // either be registered in repo-facts, or explicitly allowlisted as host/test/runtime vars.
  const registeredEnvVars = new Set(expected);
  const envAllowlist = new Set(['CI', 'HOME', 'NODE_ENV', 'USERPROFILE', 'VITEST', 'SOME_KEY']);
  const envScanRoots = ['src', 'scripts', 'tests'];
  const envScanFiles = [];
  for (const root of envScanRoots) {
    envScanFiles.push(
      ...listFilesRecursive(
        path.join(repoRoot, root),
        new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs'])
      )
    );
  }
  for (const file of envScanFiles) {
    const rel = path.relative(repoRoot, file).replaceAll(path.sep, '/');
    const content = readTextIfExists(file);
    const used = extractProcessEnvVarNames(content);
    for (const name of used) {
      if (registeredEnvVars.has(name) || envAllowlist.has(name)) continue;
      console.error(
        `Repo facts check failed: ${rel} references process.env.${name}, but it is not declared in registry/repo-facts.yaml facts.environment.variables.`
      );
      console.error(
        'Fix: add the env var to the registry (and .env.example), or remove the usage.'
      );
      process.exit(1);
    }
  }

  // Ensure docs follow the date suffix convention (where enforced).
  const docsConv = registry.conventions?.docs;
  if (docsConv) {
    const undatedGlobs = docsConv.undatedGlobs ?? [];
    for (const dir of docsConv.enforceDateSuffixInDirs ?? []) {
      const fullDir = path.join(repoRoot, dir);
      if (!fileExists(fullDir)) continue;
      const files = listFilesRecursive(fullDir, new Set(['.md']));
      for (const file of files) {
        const rel = path.relative(repoRoot, file).replaceAll(path.sep, '/');
        if (isUndatedException(rel, undatedGlobs)) continue;
        if (!hasDateSuffix(path.basename(file))) {
          console.error(`Repo facts check failed: docs file missing -YYYYMMDD suffix: ${rel}`);
          console.error(
            'Fix: rename the file to include a date suffix, or add it to conventions.docs.undatedGlobs in registry/repo-facts.yaml.'
          );
          process.exit(1);
        }
      }
    }
  }

  // Ensure CI runs the required npm scripts (basic drift check).
  const pkgPath = path.join(repoRoot, 'package.json');
  const pkgText = readTextIfExists(pkgPath);
  let pkg = null;
  try {
    pkg = JSON.parse(pkgText);
  } catch {
    // Ignore; other checks will fail elsewhere.
  }
  const pkgScripts =
    pkg && typeof pkg === 'object' && pkg.scripts && typeof pkg.scripts === 'object'
      ? pkg.scripts
      : {};

  for (const script of registry.quality.requiredNpmScripts ?? []) {
    if (!(script in pkgScripts)) {
      console.error(`Repo facts check failed: package.json missing script: ${script}`);
      console.error(
        'Fix: add it to package.json scripts (or remove it from registry/repo-facts.yaml).'
      );
      process.exit(1);
    }
  }

  // Guard against drift: hardcoded artifact filenames in source should use DEFAULT_ARTIFACT_FILENAMES.
  const artifactNames = (registry.artifacts ?? []).map((a) => String(a.defaultFilename));
  const disallowedLiteralPattern = artifactNames
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  if (disallowedLiteralPattern) {
    const enforceDirs = ['src/cli', 'src/core', 'src/lab', 'src/server', 'src/demo'];
    const srcFiles = [];
    for (const dir of enforceDirs) {
      srcFiles.push(...listFilesRecursive(path.join(repoRoot, dir), new Set(['.ts', '.tsx'])));
    }
    const disallow = new RegExp(`['"](?:${disallowedLiteralPattern})['"]`);
    const allowlist = new Set(['src/domain/repo-facts.generated.ts']);
    for (const file of srcFiles) {
      const rel = path.relative(repoRoot, file).replaceAll(path.sep, '/');
      if (rel.endsWith('.test.ts') || rel.endsWith('.spec.ts')) continue;
      if (allowlist.has(rel)) continue;
      const content = readTextIfExists(file);
      if (!disallow.test(content)) continue;
      if (content.includes('DEFAULT_ARTIFACT_FILENAMES')) continue;
      console.error(
        `Repo facts check failed: hardcoded artifact filename found without DEFAULT_ARTIFACT_FILENAMES in ${rel}`
      );
      console.error(
        'Fix: import and use DEFAULT_ARTIFACT_FILENAMES from src/domain/repo-facts.generated.ts.'
      );
      process.exit(1);
    }
  }

  const configTsPath = path.join(repoRoot, 'src', 'core', 'config.ts');
  const configTs = readTextIfExists(configTsPath);
  if (
    !configTs.includes('PROJECT_CONFIG_CANDIDATES') ||
    !configTs.includes('USER_CONFIG_CANDIDATES')
  ) {
    console.error(
      'Repo facts check failed: src/core/config.ts must use PROJECT_CONFIG_CANDIDATES and USER_CONFIG_CANDIDATES from generated repo facts.'
    );
    console.error(
      'Fix: import candidates from src/domain/repo-facts.generated.ts and stop hardcoding config file aliases.'
    );
    process.exit(1);
  }
  if (
    !configTs.includes('DEFAULT_CONFIG_SYNC_STRATEGY') ||
    !configTs.includes('DEFAULT_VISUALS_PROVIDER_ID') ||
    !configTs.includes('DEFAULT_MOTION_STRATEGY_ID') ||
    !configTs.includes('DEFAULT_NANOBANANA_MODEL')
  ) {
    console.error(
      'Repo facts check failed: src/core/config.ts must source sync/visual defaults and nanobanana model defaults from generated repo facts constants.'
    );
    console.error(
      'Fix: use DEFAULT_CONFIG_SYNC_STRATEGY, DEFAULT_VISUALS_PROVIDER_ID, DEFAULT_MOTION_STRATEGY_ID, and DEFAULT_NANOBANANA_MODEL from src/domain/repo-facts.generated.ts.'
    );
    process.exit(1);
  }

  const llmFactoryPath = path.join(repoRoot, 'src', 'core', 'llm', 'index.ts');
  const llmFactory = readTextIfExists(llmFactoryPath);
  if (
    !llmFactory.includes('LLM_PROVIDERS') ||
    !llmFactory.includes('resolveProviderDefaultModel')
  ) {
    console.error(
      'Repo facts check failed: src/core/llm/index.ts must derive provider default models from generated repo facts.'
    );
    console.error(
      'Fix: import LLM_PROVIDERS from src/domain/repo-facts.generated.ts and resolve defaults via provider facts.'
    );
    process.exit(1);
  }

  const audioCommandPath = path.join(repoRoot, 'src', 'cli', 'commands', 'audio.ts');
  const audioCommand = readTextIfExists(audioCommandPath);
  if (!audioCommand.includes('DEFAULT_AUDIO_COMMAND_SYNC_STRATEGY')) {
    console.error(
      'Repo facts check failed: src/cli/commands/audio.ts must use DEFAULT_AUDIO_COMMAND_SYNC_STRATEGY from generated repo facts.'
    );
    console.error(
      'Fix: import DEFAULT_AUDIO_COMMAND_SYNC_STRATEGY from src/domain/repo-facts.generated.ts and use it for sync-strategy defaults.'
    );
    process.exit(1);
  }

  const initCommandPath = path.join(repoRoot, 'src', 'cli', 'commands', 'init.ts');
  const initCommand = readTextIfExists(initCommandPath);
  if (
    !initCommand.includes('SUPPORTED_VISUALS_PROVIDER_IDS') ||
    !initCommand.includes('resolveLlmDefaultModel')
  ) {
    console.error(
      'Repo facts check failed: src/cli/commands/init.ts must derive default provider/model values from generated repo facts.'
    );
    console.error(
      'Fix: use SUPPORTED_VISUALS_PROVIDER_IDS and LLM_PROVIDERS generated constants for init defaults.'
    );
    process.exit(1);
  }
  if (
    !initCommand.includes('DEFAULT_VISUALS_PROVIDER_ID') ||
    !initCommand.includes('DEFAULT_MOTION_STRATEGY_ID') ||
    !initCommand.includes('DEFAULT_NANOBANANA_MODEL') ||
    !initCommand.includes('MOTION_STRATEGIES')
  ) {
    console.error(
      'Repo facts check failed: src/cli/commands/init.ts must derive visuals defaults and motion choices from generated repo facts constants.'
    );
    console.error(
      'Fix: use DEFAULT_VISUALS_PROVIDER_ID, DEFAULT_MOTION_STRATEGY_ID, DEFAULT_NANOBANANA_MODEL, and MOTION_STRATEGIES from src/domain/repo-facts.generated.ts.'
    );
    process.exit(1);
  }

  const generateCommandPath = path.join(repoRoot, 'src', 'cli', 'commands', 'generate.ts');
  const generateCommand = readTextIfExists(generateCommandPath);
  if (
    !generateCommand.includes('DEFAULT_SYNC_PRESET_ID') ||
    !generateCommand.includes('PREFERRED_QUALITY_SYNC_PRESET_ID')
  ) {
    console.error(
      'Repo facts check failed: src/cli/commands/generate.ts must use generated sync preset defaults.'
    );
    console.error(
      'Fix: import DEFAULT_SYNC_PRESET_ID and PREFERRED_QUALITY_SYNC_PRESET_ID from src/domain/repo-facts.generated.ts.'
    );
    process.exit(1);
  }
  if (
    !generateCommand.includes('createLLMProvider') ||
    generateCommand.includes('new OpenAIProvider(')
  ) {
    console.error(
      'Repo facts check failed: src/cli/commands/generate.ts research bootstrap must not hardcode OpenAI provider construction.'
    );
    console.error(
      'Fix: derive provider/model/keys from generated repo facts and config, then instantiate via createLLMProvider.'
    );
    process.exit(1);
  }

  const motionTypesPath = path.join(repoRoot, 'src', 'visuals', 'motion', 'types.ts');
  const motionTypes = readTextIfExists(motionTypesPath);
  if (
    !motionTypes.includes('MOTION_STRATEGY_FACTS') ||
    !motionTypes.includes('RepoFactsMotionStrategyId')
  ) {
    console.error(
      'Repo facts check failed: src/visuals/motion/types.ts must derive motion strategy metadata and ids from generated repo facts.'
    );
    console.error(
      'Fix: import MOTION_STRATEGIES and RepoFactsMotionStrategyId from src/domain/repo-facts.generated.ts and build the runtime registry from it.'
    );
    process.exit(1);
  }

  const visualsSchemaPath = path.join(repoRoot, 'src', 'visuals', 'schema.ts');
  const visualsSchema = readTextIfExists(visualsSchemaPath);
  if (
    !visualsSchema.includes('MOTION_STRATEGIES') ||
    !visualsSchema.includes('RepoFactsMotionStrategyId')
  ) {
    console.error(
      'Repo facts check failed: src/visuals/schema.ts must derive MotionStrategyEnum from generated repo facts constants.'
    );
    console.error(
      'Fix: import MOTION_STRATEGIES and RepoFactsMotionStrategyId from src/domain/repo-facts.generated.ts and construct MotionStrategyEnum from generated ids.'
    );
    process.exit(1);
  }

  const syncRefPath = path.join(repoRoot, 'docs', 'reference', 'SYNC-CONFIG-REFERENCE-20260107.md');
  const syncRef = readTextIfExists(syncRefPath);
  if (
    !syncRef.includes('| `--sync-strategy`') ||
    !syncRef.includes('`audio-first`') ||
    !syncRef.includes('| `standard` | audio-first')
  ) {
    console.error(
      'Repo facts check failed: docs/reference/SYNC-CONFIG-REFERENCE-20260107.md is out of sync with canonical sync defaults.'
    );
    console.error(
      'Fix: align sync defaults/preset mappings with registry/repo-facts.yaml (see docs/reference/PIPELINE-PRESETS.md).'
    );
    process.exit(1);
  }

  const ciPath = path.join(repoRoot, registry.quality.ci.workflowPath);
  const ciText = readTextIfExists(ciPath);
  for (const script of registry.quality.requiredNpmScripts ?? []) {
    const needle = `npm run ${script}`;
    if (!ciText.includes(needle)) {
      console.error(`Repo facts check failed: CI workflow missing step running: ${needle}`);
      console.error(`Expected to find it in: ${registry.quality.ci.workflowPath}`);
      process.exit(1);
    }
  }

  // Conservative source scan: do not log env var values in src/.
  const securityPatterns = registry.security.bannedLogValuePatterns ?? [];
  if (securityPatterns.length > 0) {
    const srcDir = path.join(repoRoot, 'src');
    const files = listFilesRecursive(srcDir, new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']));
    for (const file of files) {
      const rel = path.relative(repoRoot, file).replaceAll(path.sep, '/');
      const content = readTextIfExists(file);
      for (const pat of securityPatterns) {
        const re = new RegExp(String(pat));
        if (re.test(content)) {
          console.error(
            `Repo facts check failed: possible secret logging pattern in ${rel}: /${pat}/`
          );
          console.error(
            'Fix: never log process.env.* values; pass secrets only to provider constructors.'
          );
          process.exit(1);
        }
      }
    }
  }

  const before = new Map(outputs.map((p) => [p, fs.readFileSync(p, 'utf8')]));

  run(process.execPath, [path.join(repoRoot, 'scripts', 'gen-repo-facts.mjs')], { cwd: repoRoot });

  for (const p of outputs) {
    const after = fs.readFileSync(p, 'utf8');
    if (after !== before.get(p)) {
      console.error('Repo facts generated outputs are out of date.');
      console.error('Fix: run `npm run repo-facts:gen` and commit the result.');
      process.exit(1);
    }
  }
}

main();
