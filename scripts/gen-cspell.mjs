import fs from 'node:fs';
import path from 'node:path';
import { readUbiquitousLanguageRegistry } from './lib/ubiquitous-language.mjs';

const RepoRoot = process.cwd();

function stableUniqueSorted(items) {
  const out = Array.from(new Set(items.filter(Boolean)));
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function isProbablyWord(s) {
  // Keep this conservative: cspell dictionary entries are typically single tokens.
  // Allow letters, digits, underscore, and dashes. Drop spaces/parentheticals.
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(s);
}

function extractWords(registry) {
  const terms = Array.isArray(registry?.terms) ? registry.terms : [];
  const words = [];

  for (const t of terms) {
    if (t?.term) words.push(String(t.term));
    if (t?.id) words.push(String(t.id));

    for (const n of t?.canonicalTypes ?? []) words.push(String(n));
    for (const n of t?.canonicalSchemas ?? []) words.push(String(n));

    // canonicalName is user-facing; split into tokens, but only keep "wordy" tokens.
    if (t?.canonicalName) {
      const parts = String(t.canonicalName)
        .split(/[^A-Za-z0-9_-]+/g)
        .map((x) => x.trim())
        .filter(Boolean);
      for (const p of parts) words.push(p);
    }
  }

  return stableUniqueSorted(words).filter(isProbablyWord);
}

function renderDictionary(words) {
  const lines = [];
  lines.push('# DO NOT EDIT: generated from registry/ubiquitous-language.yaml.');
  lines.push('# Update the registry, then run: npm run cspell:gen');
  lines.push('');
  for (const w of words) lines.push(w);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const { registry } = readUbiquitousLanguageRegistry({ repoRoot: RepoRoot });
  const words = extractWords(registry);
  const outPath = path.join(RepoRoot, 'config', 'cspell', 'ubiquitous-language.txt');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderDictionary(words), 'utf8');
}

main();
