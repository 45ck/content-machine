import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import {
  buildCanonicalExportToTermIdMap,
  readUbiquitousLanguageRegistry,
} from '../lib/ubiquitous-language.mjs';

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trimEnd();
}

function runAllowFail(cmd, args, opts = {}) {
  try {
    return run(cmd, args, opts);
  } catch {
    return '';
  }
}

function searchExport(repoRoot, name) {
  // Prefer ripgrep for speed, fall back to grep for portability.
  const pattern = `\\bexport\\s+(type|const|interface)\\s+${name}\\b`;
  const rg = runAllowFail('rg', ['-n', '-S', pattern, 'src'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (rg) return rg;

  // grep -RE supports basic alternation via extended regex; use a simpler pattern.
  const grepPattern = `export[[:space:]]+(type|const|interface)[[:space:]]+${name}\\b`;
  return runAllowFail('grep', ['-R', '-n', '-E', grepPattern, 'src'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

function hasInternalTag(jsDocNodes) {
  for (const doc of jsDocNodes ?? []) {
    const tags = doc.tags ?? [];
    for (const tag of tags) {
      const tagName = tag.tagName?.getText?.();
      if (tagName === 'internal') return true;
    }
  }
  return false;
}

function hasJsDoc(node, sourceFile) {
  const jsDocs = ts.getJSDocCommentsAndTags(node).filter((t) => t.kind === ts.SyntaxKind.JSDoc);
  if (jsDocs.length === 0) return false;
  return !hasInternalTag(jsDocs, sourceFile);
}

function findDeclarationLocations(repoRoot, name) {
  // Prefer direct exported declarations, not re-exports:
  // - matches: `export type Foo = ...`
  // - does NOT match: `export type { Foo } from ...`
  const pattern = `\\bexport\\s+(const|type|interface|class|function|enum)\\s+${name}\\b`;
  const locs = [];

  const rg = runAllowFail('rg', ['-n', '-S', pattern, 'src'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (rg) {
    for (const line of rg.split('\n')) {
      const [file, lineNo] = line.split(':');
      if (!file || !lineNo) continue;
      locs.push({ file, line: Number.parseInt(lineNo, 10) || 0 });
    }
  } else {
    const grepPattern = `export[[:space:]]+(const|type|interface|class|function|enum)[[:space:]]+${name}\\b`;
    const grep = runAllowFail('grep', ['-R', '-n', '-E', grepPattern, 'src'], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (grep) {
      for (const line of grep.split('\n')) {
        const [file, lineNo] = line.split(':');
        if (!file || !lineNo) continue;
        locs.push({ file, line: Number.parseInt(lineNo, 10) || 0 });
      }
    }
  }

  // Stable + unique.
  const uniq = new Map();
  for (const l of locs) {
    const key = `${l.file}:${l.line}`;
    if (!uniq.has(key)) uniq.set(key, l);
  }
  return Array.from(uniq.values()).sort((a, b) =>
    a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)
  );
}

function extractCmTermTags(node) {
  const out = [];
  const tags = ts.getJSDocTags(node) ?? [];
  for (const tag of tags) {
    const tagName = tag.tagName?.getText?.();
    if (tagName !== 'cmTerm') continue;

    const comment = tag.comment;
    if (typeof comment === 'string') {
      const v = comment.trim();
      if (v) out.push(v);
      continue;
    }

    // Fall back to parsing tag text if TS doesn't provide a string comment.
    const text = tag.getText?.() ?? '';
    const m = text.match(/@cmTerm\\s+([^\\s*]+)/);
    if (m?.[1]) out.push(m[1].trim());
  }
  return out;
}

function assertCanonicalHasJsDoc(repoRoot, name, expectedTermId, errors) {
  const locs = findDeclarationLocations(repoRoot, name);
  if (locs.length === 0) {
    errors.push(`Missing exported declaration for canonical name (re-export only?): ${name}`);
    return;
  }
  if (locs.length > 1) {
    errors.push(
      `Multiple exported declarations for canonical name: ${name}. Fix: keep ONE declaration and re-export elsewhere. Locations: ${locs
        .map((l) => `${l.file}:${l.line}`)
        .join(', ')}`
    );
    return;
  }

  const declFile = locs[0].file;
  const fullPath = path.join(repoRoot, declFile);
  const code = fs.readFileSync(fullPath, 'utf8');
  const sourceFile = ts.createSourceFile(declFile, code, ts.ScriptTarget.Latest, true);

  function isExported(node) {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) return false;
    return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  function recordMissing(node) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    errors.push(`Missing JSDoc for canonical export: ${name} (${declFile}:${line + 1})`);
  }

  function recordMissingTerm(node) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    errors.push(
      `Missing @cmTerm ${expectedTermId} for canonical export: ${name} (${declFile}:${line + 1})`
    );
  }

  function recordWrongTerm(node, actual) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    errors.push(
      `Wrong @cmTerm for canonical export: ${name} (${declFile}:${line + 1}). Expected: ${expectedTermId}. Found: ${actual.join(
        ', '
      )}`
    );
  }

  for (const st of sourceFile.statements) {
    if (!isExported(st)) continue;

    if (ts.isVariableStatement(st)) {
      for (const decl of st.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name) {
          if (!hasJsDoc(st, sourceFile)) recordMissing(st);
          else {
            const tags = extractCmTermTags(st);
            if (tags.length === 0) recordMissingTerm(st);
            else if (!tags.includes(expectedTermId)) recordWrongTerm(st, tags);
          }
          return;
        }
      }
      continue;
    }

    if (ts.isTypeAliasDeclaration(st) && st.name.text === name) {
      if (!hasJsDoc(st, sourceFile)) recordMissing(st);
      else {
        const tags = extractCmTermTags(st);
        if (tags.length === 0) recordMissingTerm(st);
        else if (!tags.includes(expectedTermId)) recordWrongTerm(st, tags);
      }
      return;
    }
    if (ts.isInterfaceDeclaration(st) && st.name.text === name) {
      if (!hasJsDoc(st, sourceFile)) recordMissing(st);
      else {
        const tags = extractCmTermTags(st);
        if (tags.length === 0) recordMissingTerm(st);
        else if (!tags.includes(expectedTermId)) recordWrongTerm(st, tags);
      }
      return;
    }
    if (ts.isFunctionDeclaration(st) && st.name?.text === name) {
      if (!hasJsDoc(st, sourceFile)) recordMissing(st);
      else {
        const tags = extractCmTermTags(st);
        if (tags.length === 0) recordMissingTerm(st);
        else if (!tags.includes(expectedTermId)) recordWrongTerm(st, tags);
      }
      return;
    }
    if (ts.isClassDeclaration(st) && st.name?.text === name) {
      if (!hasJsDoc(st, sourceFile)) recordMissing(st);
      else {
        const tags = extractCmTermTags(st);
        if (tags.length === 0) recordMissingTerm(st);
        else if (!tags.includes(expectedTermId)) recordWrongTerm(st, tags);
      }
      return;
    }
    if (ts.isEnumDeclaration(st) && st.name.text === name) {
      if (!hasJsDoc(st, sourceFile)) recordMissing(st);
      else {
        const tags = extractCmTermTags(st);
        if (tags.length === 0) recordMissingTerm(st);
        else if (!tags.includes(expectedTermId)) recordWrongTerm(st, tags);
      }
      return;
    }
  }

  errors.push(`Unable to locate canonical export node for JSDoc check: ${name} (${declFile})`);
}

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
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

function main() {
  const repoRoot = process.cwd();
  const registryPath = path.join(repoRoot, 'registry', 'ubiquitous-language.yaml');
  const glossaryPath = path.join(repoRoot, 'docs', 'reference', 'GLOSSARY.md');
  const idsPath = path.join(repoRoot, 'src', 'domain', 'ids.ts');
  const ulTsPath = path.join(repoRoot, 'src', 'domain', 'ubiquitous-language.generated.ts');
  const cspellDictPath = path.join(repoRoot, 'config', 'cspell', 'ubiquitous-language.txt');

  const errors = [];
  if (!fileExists(registryPath)) errors.push(`Missing registry: ${registryPath}`);
  if (!fileExists(glossaryPath)) errors.push(`Missing glossary: ${glossaryPath}`);
  if (!fileExists(idsPath)) errors.push(`Missing ids module: ${idsPath}`);
  if (!fileExists(ulTsPath)) errors.push(`Missing generated TS registry: ${ulTsPath}`);
  if (!fileExists(cspellDictPath)) errors.push(`Missing cspell dictionary: ${cspellDictPath}`);

  if (errors.length > 0) {
    console.error('Ubiquitous language checks failed:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  const { registry } = readUbiquitousLanguageRegistry({ repoRoot });

  if ((registry.enforcement?.bannedPhrases ?? []).length === 0) {
    errors.push('enforcement.bannedPhrases must not be empty in registry/ubiquitous-language.yaml');
  }

  // 1) Ensure glossary is generated from registry (idempotent).
  const before = fs.readFileSync(glossaryPath, 'utf8');
  run(process.execPath, [path.join(repoRoot, 'scripts', 'gen-glossary.mjs')], { cwd: repoRoot });
  const after = fs.readFileSync(glossaryPath, 'utf8');
  if (before !== after) {
    console.error('Glossary is out of date.');
    console.error('Fix: run `npm run glossary:gen` and commit the result.');
    process.exit(1);
  }

  // 1.5) Ensure cspell domain dictionary is generated from registry (idempotent).
  const cspellBefore = fs.readFileSync(cspellDictPath, 'utf8');
  run(process.execPath, [path.join(repoRoot, 'scripts', 'gen-cspell.mjs')], { cwd: repoRoot });
  const cspellAfter = fs.readFileSync(cspellDictPath, 'utf8');
  if (cspellBefore !== cspellAfter) {
    console.error('CSpell domain dictionary is out of date.');
    console.error('Fix: run `npm run cspell:gen` and commit the result.');
    process.exit(1);
  }

  // 1.75) Ensure the generated TS registry is generated from YAML (idempotent).
  const ulTsBefore = fs.readFileSync(ulTsPath, 'utf8');
  run(process.execPath, [path.join(repoRoot, 'scripts', 'gen-ubiquitous-language-ts.mjs')], {
    cwd: repoRoot,
  });
  const ulTsAfter = fs.readFileSync(ulTsPath, 'utf8');
  if (ulTsBefore !== ulTsAfter) {
    console.error('Generated TS registry is out of date.');
    console.error('Fix: run `npm run ul:gen` and commit the result.');
    process.exit(1);
  }

  // 2) Ensure canonical type/schema names exist somewhere in src/.
  const terms = Array.isArray(registry?.terms) ? registry.terms : [];

  const names = [];
  for (const t of terms) {
    for (const n of t?.canonicalTypes ?? []) names.push(String(n));
    for (const n of t?.canonicalSchemas ?? []) names.push(String(n));
  }

  const uniqueNames = Array.from(new Set(names)).filter(Boolean);
  for (const name of uniqueNames) {
    const hit = searchExport(repoRoot, name);
    if (!hit) errors.push(`Missing canonical export in src/: ${name}`);
  }

  // 2.5) Ensure canonical types/schemas have JSDoc in their declaring module.
  const expectedTermIdByExport = buildCanonicalExportToTermIdMap(registry);
  for (const name of uniqueNames) {
    const expected = expectedTermIdByExport.get(name);
    if (!expected) {
      errors.push(`Missing term id mapping for canonical export in registry: ${name}`);
      continue;
    }
    assertCanonicalHasJsDoc(repoRoot, name, expected, errors);
  }

  // 3) Guard the most visible CLI help strings (static check).
  // We intentionally avoid executing the CLI here (would require a build).
  const generateCmd = fs.readFileSync(
    path.join(repoRoot, 'src', 'cli', 'commands', 'generate.ts'),
    'utf8'
  );
  if (!/Script archetype/i.test(generateCmd))
    errors.push('generate.ts missing phrase: "Script archetype"');
  if (!/Render template/i.test(generateCmd))
    errors.push('generate.ts missing phrase: "Render template"');
  if (!/Pipeline workflow/i.test(generateCmd))
    errors.push('generate.ts missing phrase: "Pipeline workflow"');

  // 3.5) Enforce a small set of banned phrases in user-facing surfaces.
  //
  // Scope: user-facing docs + CLI sources. Exclude research/architecture (historical notes)
  // and the registry/glossary themselves (they intentionally contain "synonyms to avoid").
  const defaultBannedPhrases = [
    {
      phrase: 'content archetype',
      fix: 'Use "script archetype" (or just "archetype" with context).',
    },
    { phrase: 'video template', fix: 'Use "render template".' },
    { phrase: 'script template', fix: 'Use "script archetype".' },
    { phrase: 'sfx pack name', fix: 'Use "SFX pack id".' },
    { phrase: 'extension pack', fix: 'Use "pack" (or "template pack"/"workflow pack").' },
    { phrase: 'plugin', fix: 'Prefer "pack" or "code template" depending on context.' },
    { phrase: 'recipe', fix: 'Use "workflow".' },
  ];

  const yamlBanned = registry?.enforcement?.bannedPhrases;
  const bannedPhrases = (Array.isArray(yamlBanned) ? yamlBanned : defaultBannedPhrases)
    .map((r) => ({
      phrase: String(r?.phrase ?? '')
        .toLowerCase()
        .trim(),
      fix: String(r?.fix ?? '').trim(),
    }))
    .filter((r) => r.phrase && r.fix);

  const userFacingRoots = [
    path.join(repoRoot, 'AGENTS.md'),
    path.join(repoRoot, 'README.md'),
    path.join(repoRoot, 'docs', 'reference'),
    path.join(repoRoot, 'docs', 'guides'),
    path.join(repoRoot, 'docs', 'features'),
    path.join(repoRoot, 'src', 'cli'),
  ];

  const skipExact = new Set([registryPath, glossaryPath, cspellDictPath]);
  const skipDirPrefixes = [
    path.join(repoRoot, 'docs', 'reference', 'GLOSSARY.md'),
    path.join(repoRoot, 'docs', 'research'),
    path.join(repoRoot, 'docs', 'architecture'),
    path.join(repoRoot, 'vendor'),
    path.join(repoRoot, 'node_modules'),
    path.join(repoRoot, 'dist'),
  ];

  const textExts = new Set(['.md', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.yaml', '.yml']);

  for (const root of userFacingRoots) {
    const files = fs.statSync(root).isDirectory() ? listFilesRecursive(root, textExts) : [root];
    for (const file of files) {
      if (skipExact.has(file)) continue;
      if (skipDirPrefixes.some((p) => file.startsWith(p))) continue;

      let content = '';
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }

      const lower = content.toLowerCase();
      for (const rule of bannedPhrases) {
        const idx = lower.indexOf(rule.phrase);
        if (idx === -1) continue;

        // Make the error actionable with a 1-based line number.
        const before = lower.slice(0, idx);
        const line = before.split('\n').length;
        errors.push(
          `Banned phrase "${rule.phrase}" in ${path.relative(repoRoot, file)}:${line}. Fix: ${rule.fix}`
        );
      }
    }
  }

  // 4) Guard reference docs from drifting back into hardcoded lists for data-driven things.
  const docChecks = [
    {
      path: path.join(repoRoot, 'docs', 'reference', 'cm-script-reference-20260106.md'),
      mustInclude: ['--archetype <idOrPath>', 'cm archetypes list'],
      mustNotInclude: ['listicle|versus', 'howto|myth', 'story|hot-take'],
      label: 'cm-script reference archetype docs',
    },
    {
      path: path.join(repoRoot, 'docs', 'reference', 'cm-generate-reference-20260106.md'),
      mustInclude: [
        '--archetype <idOrPath>',
        'cm archetypes list',
        '--template <idOrPath>',
        '--workflow <idOrPath>',
      ],
      mustNotInclude: ['--mix-preset <preset>', '(clean, punchy, cinematic, viral)'],
      label: 'cm-generate reference data-driven docs',
    },
    {
      path: path.join(repoRoot, 'docs', 'reference', 'video-templates-reference-20260107.md'),
      mustInclude: ['defaults.archetype` (script archetype id)'],
      mustNotInclude: ['defaults.archetype` (`listicle|versus|howto|myth|story|hot-take`)'],
      label: 'video-templates reference archetype defaults docs',
    },
  ];

  for (const check of docChecks) {
    if (!fileExists(check.path)) continue;
    const content = fs.readFileSync(check.path, 'utf8');
    for (const needle of check.mustInclude ?? []) {
      if (!content.includes(needle)) errors.push(`${check.label} missing: ${needle}`);
    }
    for (const needle of check.mustNotInclude ?? []) {
      if (content.includes(needle)) errors.push(`${check.label} contains banned string: ${needle}`);
    }
  }

  if (errors.length > 0) {
    console.error('Ubiquitous language checks failed:');
    for (const e of errors) console.error(`- ${e}`);
    console.error('Fix: update src exports and/or registry/ubiquitous-language.yaml');
    process.exit(1);
  }
}

main();
