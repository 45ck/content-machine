import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import ts from 'typescript';

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function listStagedFiles() {
  const output = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACM']);
  if (!output) return [];
  return output.split('\n').map((l) => l.trim()).filter(Boolean);
}

function isSrcTsFile(filePath) {
  if (!filePath.startsWith('src/')) return false;
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return false;
  if (filePath.endsWith('.d.ts')) return false;
  if (filePath.includes('/__tests__/')) return false;
  return true;
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

function getExportedMissingDocs(sourceFile) {
  /** @type {Array<{name: string, line: number}>} */
  const missing = [];

  /**
   * @param {ts.Node} node
   * @returns {boolean}
   */
  function isExported(node) {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) return false;
    return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  /**
   * @param {ts.Node} node
   * @returns {boolean}
   */
  function hasJsDoc(node) {
    const jsDocs = ts.getJSDocCommentsAndTags(node).filter((t) => t.kind === ts.SyntaxKind.JSDoc);
    if (jsDocs.length === 0) return false;
    // Allow `@internal` as an explicit opt-out from public API docs.
    return !hasInternalTag(/** @type {any} */ (jsDocs));
  }

  /**
   * @param {ts.Node} node
   * @param {string} name
   */
  function recordMissing(node, name) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    missing.push({ name, line: line + 1 });
  }

  for (const statement of sourceFile.statements) {
    if (!isExported(statement)) continue;

    if (ts.isFunctionDeclaration(statement)) {
      const name = statement.name?.text ?? '(anonymous export function)';
      if (!hasJsDoc(statement)) recordMissing(statement, name);
      continue;
    }

    if (ts.isClassDeclaration(statement)) {
      const name = statement.name?.text ?? '(anonymous export class)';
      if (!hasJsDoc(statement)) recordMissing(statement, name);
      continue;
    }

    // `export const foo = () => {}` and `export const foo = function() {}`
    if (ts.isVariableStatement(statement)) {
      if (hasJsDoc(statement)) continue;

      for (const decl of statement.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const init = decl.initializer;
        if (!init) continue;
        if (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init)) continue;
        recordMissing(statement, decl.name.text);
      }
    }
  }

  return missing;
}

const files = listStagedFiles().filter(isSrcTsFile);
if (files.length === 0) process.exit(0);

/** @type {Array<{file: string, name: string, line: number}>} */
const allMissing = [];

for (const file of files) {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) continue;
  const code = fs.readFileSync(fullPath, 'utf8');
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  for (const m of getExportedMissingDocs(sourceFile)) {
    allMissing.push({ file, ...m });
  }
}

if (allMissing.length === 0) process.exit(0);

console.error('JSDoc required for exported public API (staged files):');
for (const m of allMissing) {
  console.error(`- ${m.file}:${m.line} ${m.name}`);
}
console.error('Fix: add a `/** ... */` doc block above the exported declaration.');
console.error('Opt-out: add `@internal` inside the JSDoc block.');
process.exit(1);

