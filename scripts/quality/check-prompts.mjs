import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const VALID_CATEGORIES = new Set(['script', 'visuals', 'image-generation', 'editing', 'metadata']);
const VALID_PROVIDERS = new Set(['openai', 'anthropic', 'gemini', 'pexels', 'any']);
const VALID_OUTPUT_FORMATS = new Set(['json', 'text', 'markdown', 'structured']);

function listPromptFiles(rootDir) {
  const out = [];
  const categories = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const category of categories) {
    const categoryDir = path.join(rootDir, category);
    const files = fs
      .readdirSync(categoryDir)
      .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
      .map((name) => path.join(categoryDir, name));
    out.push(...files);
  }

  return out;
}

function extractPlaceholders(input) {
  const placeholders = new Set();
  const variableRegex = /\{\{\s*([A-Za-z_]\w*)\s*\}\}/g;
  let match = variableRegex.exec(input);
  while (match) {
    if (match[1] !== 'else') placeholders.add(match[1]);
    match = variableRegex.exec(input);
  }

  const ifRegex = /\{\{#if\s+(\w+)\s*\}\}/g;
  match = ifRegex.exec(input);
  while (match) {
    placeholders.add(match[1]);
    match = ifRegex.exec(input);
  }

  return placeholders;
}

function validatePrompt(prompt, sourcePath) {
  const errors = [];
  if (!prompt || typeof prompt !== 'object') {
    return ['template must parse to an object'];
  }

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
    if (typeof prompt[field] !== 'string' || prompt[field].trim().length === 0) {
      errors.push(`missing or invalid field: ${field}`);
    }
  }

  if (!Array.isArray(prompt.variables)) {
    errors.push('missing or invalid field: variables');
  }

  if (!Array.isArray(prompt.tags)) {
    errors.push('missing or invalid field: tags');
  }

  if (typeof prompt.category === 'string' && !VALID_CATEGORIES.has(prompt.category)) {
    errors.push(`invalid category: ${prompt.category}`);
  }

  if (typeof prompt.provider === 'string' && !VALID_PROVIDERS.has(prompt.provider)) {
    errors.push(`invalid provider: ${prompt.provider}`);
  }

  if (typeof prompt.outputFormat === 'string' && !VALID_OUTPUT_FORMATS.has(prompt.outputFormat)) {
    errors.push(`invalid outputFormat: ${prompt.outputFormat}`);
  }

  const seenVariableNames = new Set();
  if (Array.isArray(prompt.variables)) {
    for (const variable of prompt.variables) {
      if (!variable || typeof variable !== 'object') {
        errors.push('invalid variable entry: expected object');
        continue;
      }
      if (typeof variable.name !== 'string' || variable.name.trim().length === 0) {
        errors.push('invalid variable entry: missing name');
        continue;
      }
      if (seenVariableNames.has(variable.name)) {
        errors.push(`duplicate variable name: ${variable.name}`);
      }
      seenVariableNames.add(variable.name);
    }
  }

  if (typeof prompt.template === 'string') {
    for (const placeholder of extractPlaceholders(prompt.template)) {
      if (!seenVariableNames.has(placeholder)) {
        errors.push(`template placeholder has no variable definition: ${placeholder}`);
      }
    }
  }

  return errors.map((error) => `${sourcePath}: ${error}`);
}

function main() {
  const repoRoot = process.cwd();
  const templatesRoot = path.join(repoRoot, 'src', 'prompts', 'templates');
  if (!fs.existsSync(templatesRoot)) {
    console.error(`Prompt templates directory not found: ${templatesRoot}`);
    process.exit(1);
  }

  const files = listPromptFiles(templatesRoot);
  const errors = [];
  const seenIds = new Map();

  for (const file of files) {
    const rel = path.relative(repoRoot, file).replaceAll(path.sep, '/');
    let parsed;
    try {
      parsed = parseYaml(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      errors.push(
        `${rel}: YAML parse error: ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }

    errors.push(...validatePrompt(parsed, rel));

    const id = parsed && typeof parsed.id === 'string' ? parsed.id : null;
    if (id) {
      const existing = seenIds.get(id);
      if (existing) {
        errors.push(`${rel}: duplicate template id '${id}' (already defined in ${existing})`);
      } else {
        seenIds.set(id, rel);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Prompt template quality checks failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Prompt template quality checks passed (${files.length} files).`);
}

main();
