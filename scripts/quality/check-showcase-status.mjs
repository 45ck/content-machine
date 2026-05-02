#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifestPath = 'docs/demo/manifest.json';
const statusDocs = [
  'docs/user/showcase/README.md',
  'docs/user/ARCHETYPES.md',
  'docs/user/EXAMPLES.md',
  'docs/demo/README.md',
];

const errors = [];

function readText(path) {
  return readFileSync(path.startsWith(repoRoot) ? path : join(repoRoot, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function fail(message) {
  errors.push(message);
}

function demoNumber(demoId) {
  return demoId.match(/^demo-\d+/)?.[0] ?? demoId;
}

function publicDemos(manifest) {
  return (manifest.demos ?? []).filter((demo) => demo.publicUse !== 'archive');
}

function findStatusRows(docText, demo) {
  const videoName = basename(demo.videoPath);
  const demoShort = demoNumber(demo.demoId);
  return docText
    .split('\n')
    .filter(
      (line) => line.includes(videoName) || line.includes(demo.demoId) || line.includes(demoShort)
    );
}

const manifest = readJson(manifestPath);
const demos = publicDemos(manifest);

for (const docPath of statusDocs) {
  const text = readText(docPath);
  for (const demo of demos) {
    const rows = findStatusRows(text, demo);
    if (rows.length === 0) continue;
    const statusRows = rows.filter(
      (line) =>
        line.trim().startsWith('|') && line.includes('`') && /candidate|showcase|preview/.test(line)
    );
    for (const row of statusRows) {
      if (!row.includes(`\`${demo.maturity}\``)) {
        fail(`${docPath} has a stale maturity row for ${demo.demoId}; expected ${demo.maturity}.`);
      }
    }
  }
}

const checkedSourceDocs = new Set();
for (const demo of demos) {
  if (!demo.sourceDoc?.startsWith('docs/user/examples/')) continue;
  if (checkedSourceDocs.has(demo.sourceDoc)) continue;
  checkedSourceDocs.add(demo.sourceDoc);

  const text = readText(demo.sourceDoc);
  const statusLine = text.split('\n').find((line) => line.startsWith('Status:'));
  if (!statusLine) continue;
  if (!/candidate|showcase|preview/.test(statusLine)) continue;
  const demosForSource = demos.filter((candidate) => candidate.sourceDoc === demo.sourceDoc);
  const expectedMaturities = new Set(demosForSource.map((candidate) => candidate.maturity));
  if (![...expectedMaturities].some((maturity) => statusLine.includes(`\`${maturity}\``))) {
    fail(
      `${demo.sourceDoc} has status line "${statusLine}", expected one of ${[
        ...expectedMaturities,
      ].join(', ')}.`
    );
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Showcase status check passed for ${demos.length} public demos.`);
