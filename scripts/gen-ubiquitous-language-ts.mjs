import fs from 'node:fs';
import path from 'node:path';
import { readUbiquitousLanguageRegistry } from './lib/ubiquitous-language.mjs';

const RepoRoot = process.cwd();

function tsString(s) {
  return JSON.stringify(String(s));
}

function renderTs({ registry }) {
  const ids = registry.terms.map((t) => t.id);
  const termEntries = registry.terms.map((t) => {
    return (
      `  ${tsString(t.id)}: {\n` +
      `    id: ${tsString(t.id)},\n` +
      `    canonicalName: ${tsString(t.canonicalName)},\n` +
      `    term: ${tsString(t.term)},\n` +
      `    ownedBy: ${tsString(t.ownedBy)},\n` +
      `    definition: ${tsString(t.definition.trim())},\n` +
      `    canonicalTypes: ${JSON.stringify(t.canonicalTypes)},\n` +
      `    canonicalSchemas: ${JSON.stringify(t.canonicalSchemas)},\n` +
      `  }`
    );
  });

  const lines = [];
  lines.push('/*');
  lines.push(' * DO NOT EDIT: generated from docs/reference/ubiquitous-language.yaml');
  lines.push(' * Run: npm run ul:gen');
  lines.push(' */');
  lines.push('');
  lines.push('export const UBIQUITOUS_TERM_IDS = ' + JSON.stringify(ids) + ' as const;');
  lines.push('');
  lines.push('export type UbiquitousTermId = (typeof UBIQUITOUS_TERM_IDS)[number];');
  lines.push('');
  lines.push('export type UbiquitousLanguageTerm = {');
  lines.push('  id: UbiquitousTermId;');
  lines.push('  canonicalName: string;');
  lines.push('  term: string;');
  lines.push('  ownedBy: string;');
  lines.push('  definition: string;');
  lines.push('  canonicalTypes: readonly string[];');
  lines.push('  canonicalSchemas: readonly string[];');
  lines.push('};');
  lines.push('');
  lines.push(
    'export const UBIQUITOUS_LANGUAGE_TERMS: Record<UbiquitousTermId, UbiquitousLanguageTerm> = {'
  );
  lines.push(termEntries.join(',\n'));
  lines.push('} as const;');
  lines.push('');
  return lines.join('\n');
}

async function formatTs(tsCode, outPath) {
  try {
    const mod = await import('prettier');
    const prettier = mod.default ?? mod;
    const config = (await prettier.resolveConfig(outPath)) ?? {};
    return await prettier.format(tsCode, { ...config, parser: 'typescript' });
  } catch {
    return tsCode.endsWith('\n') ? tsCode : `${tsCode}\n`;
  }
}

async function main() {
  const { registry } = readUbiquitousLanguageRegistry({ repoRoot: RepoRoot });
  const outPath = path.join(RepoRoot, 'src', 'domain', 'ubiquitous-language.generated.ts');
  const tsCode = renderTs({ registry });
  const formatted = await formatTs(tsCode, outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, formatted, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
