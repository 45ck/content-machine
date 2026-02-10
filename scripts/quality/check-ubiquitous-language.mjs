import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import ts from 'typescript';

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

function findDeclarationFile(repoRoot, name) {
  // Prefer a direct exported declaration, not a re-export.
  const pattern = `\\bexport\\s+(const|type|interface|class|function|enum)\\s+${name}\\b`;
  const rg = runAllowFail('rg', ['-n', '-S', pattern, 'src'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (rg) return rg.split('\n')[0].split(':')[0];

  const grepPattern = `export[[:space:]]+(const|type|interface|class|function|enum)[[:space:]]+${name}\\b`;
  const grep = runAllowFail('grep', ['-R', '-n', '-E', grepPattern, 'src'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (grep) return grep.split('\n')[0].split(':')[0];
  return null;
}

function assertCanonicalHasJsDoc(repoRoot, name, errors) {
  const declFile = findDeclarationFile(repoRoot, name);
  if (!declFile) {
    errors.push(`Missing exported declaration for canonical name (re-export only?): ${name}`);
    return;
  }

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

  for (const st of sourceFile.statements) {
    if (!isExported(st)) continue;

    if (ts.isVariableStatement(st)) {
      for (const decl of st.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name) {
          if (!hasJsDoc(st, sourceFile)) recordMissing(st);
          return;
        }
      }
      continue;
    }

    if (ts.isTypeAliasDeclaration(st) && st.name.text === name) {
      if (!hasJsDoc(st, sourceFile)) recordMissing(st);
      return;
    }
    if (ts.isInterfaceDeclaration(st) && st.name.text === name) {
      if (!hasJsDoc(st, sourceFile)) recordMissing(st);
      return;
    }
    if (ts.isFunctionDeclaration(st) && st.name?.text === name) {
      if (!hasJsDoc(st, sourceFile)) recordMissing(st);
      return;
    }
    if (ts.isClassDeclaration(st) && st.name?.text === name) {
      if (!hasJsDoc(st, sourceFile)) recordMissing(st);
      return;
    }
    if (ts.isEnumDeclaration(st) && st.name.text === name) {
      if (!hasJsDoc(st, sourceFile)) recordMissing(st);
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

function main() {
  const repoRoot = process.cwd();
  const registryPath = path.join(repoRoot, 'docs', 'reference', 'ubiquitous-language.yaml');
  const glossaryPath = path.join(repoRoot, 'docs', 'reference', 'GLOSSARY.md');
  const idsPath = path.join(repoRoot, 'src', 'domain', 'ids.ts');

  const errors = [];
  if (!fileExists(registryPath)) errors.push(`Missing registry: ${registryPath}`);
  if (!fileExists(glossaryPath)) errors.push(`Missing glossary: ${glossaryPath}`);
  if (!fileExists(idsPath)) errors.push(`Missing ids module: ${idsPath}`);

  if (errors.length > 0) {
    console.error('Ubiquitous language checks failed:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
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

  // 2) Ensure canonical type/schema names exist somewhere in src/.
  const parsed = parseYaml(fs.readFileSync(registryPath, 'utf8'));
  const terms = Array.isArray(parsed?.terms) ? parsed.terms : [];

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
  for (const name of uniqueNames) {
    assertCanonicalHasJsDoc(repoRoot, name, errors);
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
      mustInclude: ['--archetype <idOrPath>', 'cm archetypes list', '--template <idOrPath>', '--workflow <idOrPath>'],
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
    console.error('Fix: update src exports and/or docs/reference/ubiquitous-language.yaml');
    process.exit(1);
  }
}

main();
