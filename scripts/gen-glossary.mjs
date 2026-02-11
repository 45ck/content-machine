import fs from 'node:fs';
import path from 'node:path';
import { readUbiquitousLanguageRegistry } from './lib/ubiquitous-language.mjs';

const RepoRoot = process.cwd();

function mdList(items) {
  if (!items || items.length === 0) return '';
  return items.map((x) => `- ${x}`).join('\n');
}

function generateGlossaryMd(params) {
  const { registry } = params;
  const lines = [];
  lines.push('# Glossary (Ubiquitous Language)');
  lines.push('');
  lines.push('> DO NOT EDIT: generated from `registry/ubiquitous-language.yaml`.');
  lines.push('');
  lines.push(
    'This repo uses a few loaded words. This glossary makes them unambiguous and points to the canonical types/schemas in code.'
  );
  lines.push('');

  for (const t of registry.terms) {
    lines.push(`## ${t.canonicalName}`);
    lines.push('');
    lines.push(`**Id:** \`${t.id}\``);
    lines.push('');
    lines.push(`**Term:** ${t.term}`);
    lines.push('');
    lines.push(`**Definition:** ${t.definition.trim()}`);
    lines.push('');

    if (t.nonExamples.length > 0) {
      lines.push('**Not:**');
      lines.push(mdList(t.nonExamples));
      lines.push('');
    }

    if (t.canonicalTypes.length > 0) {
      lines.push('**Canonical types:**');
      lines.push(mdList(t.canonicalTypes.map((x) => `\`${x}\``)));
      lines.push('');
    }

    if (t.canonicalSchemas.length > 0) {
      lines.push('**Canonical schemas:**');
      lines.push(mdList(t.canonicalSchemas.map((x) => `\`${x}\``)));
      lines.push('');
    }

    if (t.whereItLives.length > 0) {
      lines.push('**Where it lives:**');
      lines.push(mdList(t.whereItLives));
      lines.push('');
    }

    if (t.cliSurface.length > 0) {
      lines.push('**CLI surface:**');
      lines.push(mdList(t.cliSurface.map((x) => `\`${x}\``)));
      lines.push('');
    }

    if (t.synonymsToAvoid.length > 0) {
      lines.push('**Synonyms to avoid:**');
      lines.push(mdList(t.synonymsToAvoid.map((x) => `\`${x}\``)));
      lines.push('');
    }

    lines.push(`**Owner:** \`${t.ownedBy}\``);
    lines.push('');
  }

  lines.push('');
  return lines.join('\n');
}

async function formatMarkdown(md, outPath) {
  try {
    const mod = await import('prettier');
    const prettier = mod.default ?? mod;
    const config = (await prettier.resolveConfig(outPath)) ?? {};
    return await prettier.format(md, { ...config, parser: 'markdown' });
  } catch {
    // Keep generator functional even when Prettier isn't available.
    return md.endsWith('\n') ? md : `${md}\n`;
  }
}

async function main() {
  const { registry } = readUbiquitousLanguageRegistry({ repoRoot: RepoRoot });
  const outPath = path.join(RepoRoot, 'docs', 'reference', 'GLOSSARY.md');
  const md = generateGlossaryMd({ registry });
  const formatted = await formatMarkdown(md, outPath);
  fs.writeFileSync(outPath, formatted, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
