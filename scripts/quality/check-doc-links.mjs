import fs from 'node:fs';
import path from 'node:path';
import { readRepoFactsRegistry } from '../lib/repo-facts.mjs';

function listMarkdownFiles(repoRoot) {
  const out = [];
  const stack = [repoRoot];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur) continue;
    const relDir = path.relative(repoRoot, cur).replaceAll(path.sep, '/');
    if (relDir && (relDir === 'node_modules' || relDir.startsWith('node_modules/'))) continue;
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
      if (ent.isFile() && full.toLowerCase().endsWith('.md')) out.push(full);
    }
  }
  return out;
}

function matchesSimpleGlob(relPath, glob) {
  const g = String(glob).replaceAll('\\', '/');
  const rel = String(relPath).replaceAll('\\', '/');
  if (g.endsWith('/**')) {
    const prefix = g.slice(0, -3);
    return rel === prefix || rel.startsWith(prefix + '/');
  }
  if (g.includes('*')) {
    const escaped = g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
    return new RegExp(`^${escaped}$`).test(rel);
  }
  return rel === g;
}

function shouldInclude(relPath, includeGlobs) {
  return includeGlobs.some((glob) => matchesSimpleGlob(relPath, glob));
}

function shouldIgnore(relPath, ignoreGlobs) {
  return ignoreGlobs.some((glob) => matchesSimpleGlob(relPath, glob));
}

function extractMarkdownLinks(content) {
  const links = [];
  const re = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    if (match[1]) links.push(match[1]);
  }
  return links;
}

function isLocalLink(target) {
  if (!target) return false;
  if (target.startsWith('#')) return false;
  if (/^[a-z]+:/i.test(target)) return false;
  if (target.startsWith('//')) return false;
  return true;
}

function normalizeTarget(target) {
  const noAnchor = target.split('#', 1)[0];
  return decodeURIComponent(noAnchor);
}

function checkFileLinks(repoRoot, filePath, errors) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relFile = path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
  const dir = path.dirname(filePath);
  const links = extractMarkdownLinks(content);

  for (const rawTarget of links) {
    if (!isLocalLink(rawTarget)) continue;
    const targetPath = normalizeTarget(rawTarget);
    if (!targetPath) continue;
    const resolved = path.resolve(dir, targetPath);
    if (!resolved.startsWith(repoRoot)) continue;
    if (!fs.existsSync(resolved)) {
      errors.push(`${relFile}: broken local link -> ${rawTarget}`);
    }
  }
}

function main() {
  const repoRoot = process.cwd();
  const { registry } = readRepoFactsRegistry({ repoRoot });
  const includeGlobs = registry.quality.docsValidation?.markdownPaths ?? [];
  const ignoreGlobs = registry.quality.docsValidation?.ignoreLinkGlobs ?? [];

  if (includeGlobs.length === 0) return;

  const markdownFiles = listMarkdownFiles(repoRoot)
    .map((full) => ({
      full,
      rel: path.relative(repoRoot, full).replaceAll(path.sep, '/'),
    }))
    .filter((entry) => shouldInclude(entry.rel, includeGlobs))
    .filter((entry) => !shouldIgnore(entry.rel, ignoreGlobs));

  const errors = [];
  for (const entry of markdownFiles) {
    checkFileLinks(repoRoot, entry.full, errors);
  }

  if (errors.length > 0) {
    console.error('Doc link check failed:');
    for (const e of errors) console.error(`- ${e}`);
    console.error(
      'Fix: update broken local Markdown links or adjust quality.docsValidation.ignoreLinkGlobs in registry/repo-facts.yaml.'
    );
    process.exit(1);
  }
}

main();
