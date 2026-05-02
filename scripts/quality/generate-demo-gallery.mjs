#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifestPath = join(repoRoot, 'docs', 'demo', 'manifest.json');
const readmePath = join(repoRoot, 'docs', 'demo', 'README.md');
const checkMode = process.argv.includes('--check');
const githubBase = 'https://github.com/45ck/content-machine/blob/master';
const githubRawBase = 'https://raw.githubusercontent.com/45ck/content-machine/master';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function relativeFromDemo(pathWithOptionalHash) {
  const [filePath, hash] = pathWithOptionalHash.split('#');
  const relativePath = relative(join(repoRoot, 'docs', 'demo'), join(repoRoot, filePath));
  const normalized = relativePath.split(posix.sep).join(posix.sep);
  return hash ? `${normalized}#${hash}` : normalized;
}

function githubBlob(path) {
  return `${githubBase}/${path}`;
}

function githubRaw(path) {
  return `${githubRawBase}/${path}`;
}

function link(label, target) {
  return `[${label}](${target})`;
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function cell(value) {
  return escapeCell(value);
}

function demoNumber(demoId) {
  return demoId.match(/^demo-\d+/)?.[0] ?? demoId;
}

function primarySurface(demo) {
  const skillLinks = (demo.skills ?? [])
    .slice(0, 2)
    .map((skill) => link(skill.name, relativeFromDemo(skill.path)));
  const flowLinks = (demo.flowPaths ?? [])
    .slice(0, 1)
    .map((path) => link(path.replace(/^flows\//, ''), relativeFromDemo(path)));
  const surfaces = [...skillLinks, ...flowLinks];
  return surfaces.length > 0 ? surfaces.join('<br>') : 'archived example';
}

function statusLinks(demo) {
  const links = [
    link('source', relativeFromDemo(demo.sourceDoc)),
    link('review', relativeFromDemo(demo.reviewReportPath)),
    link('provenance', relativeFromDemo(demo.provenanceNotesPath)),
  ];
  if (demo.assetLedgerPath)
    links.push(link('asset ledger', relativeFromDemo(demo.assetLedgerPath)));
  if (demo.publishPrepProvenancePath) {
    links.push(link('publish-prep', relativeFromDemo(demo.publishPrepProvenancePath)));
  }
  return links.join('<br>');
}

function previewImage(demo, width) {
  if (!demo.gifPath) return '';
  return [
    `<a href="${githubBlob(demo.videoPath)}">`,
    `<img src="${githubRaw(demo.gifPath)}" alt="${escapeCell(demo.title)} preview" width="${width}" />`,
    '</a>',
  ].join('');
}

function validateManifest(manifest) {
  if (manifest.schemaVersion !== 'demo-manifest.v1') {
    fail('docs/demo/manifest.json must use schemaVersion "demo-manifest.v1".');
  }
  if (!Array.isArray(manifest.demos) || manifest.demos.length === 0) {
    fail('docs/demo/manifest.json must include non-empty demos[].');
  }
  const seen = new Set();
  for (const demo of manifest.demos) {
    for (const field of [
      'demoId',
      'title',
      'maturity',
      'publicUse',
      'videoPath',
      'sourceDoc',
      'reviewReportPath',
      'provenanceNotesPath',
      'archetype',
      'whatItShows',
      'watchReason',
      'reproducePath',
    ]) {
      if (!demo[field] || typeof demo[field] !== 'string') {
        fail(`${demo.demoId ?? 'unknown demo'} missing manifest field ${field}.`);
      }
    }
    if (seen.has(demo.demoId)) fail(`duplicate manifest demoId: ${demo.demoId}`);
    seen.add(demo.demoId);
    for (const path of [
      demo.videoPath,
      demo.gifPath,
      demo.layoutPath,
      demo.sourceDoc,
      demo.reviewReportPath,
      demo.reproducePath,
      demo.assetLedgerPath,
      demo.publishPrepProvenancePath,
      demo.provenanceNotesPath.split('#')[0],
      ...(demo.flowPaths ?? []),
      ...(demo.skills ?? []).map((skill) => skill.path),
    ].filter(Boolean)) {
      if (!existsSync(join(repoRoot, path)))
        fail(`${demo.demoId} manifest path is missing: ${path}`);
    }
  }
}

function table(headers, rows) {
  const header = `| ${headers.map(cell).join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  return [header, divider, ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`)].join('\n');
}

function renderGallery(manifest) {
  validateManifest(manifest);
  const publicDemos = manifest.demos.filter((demo) => demo.publicUse !== 'archive');
  const archiveDemos = manifest.demos.filter((demo) => demo.publicUse === 'archive');
  const featuredDemos = publicDemos
    .filter((demo) => Number.isInteger(demo.featuredRank))
    .sort((left, right) => left.featuredRank - right.featuredRank);

  const featuredRows = featuredDemos.map((demo) => [
    `${link(demoNumber(demo.demoId), githubBlob(demo.videoPath))}<br>${previewImage(demo, 170)}`,
    demo.watchReason,
    `${link('inspect', relativeFromDemo(demo.provenanceNotesPath))}<br>${link(
      'reproduce',
      relativeFromDemo(demo.reproducePath)
    )}`,
  ]);

  const publicRows = publicDemos.map((demo) => [
    `${link(demoNumber(demo.demoId), githubBlob(demo.videoPath))}<br>${demo.title}`,
    `\`${demo.maturity}\``,
    demo.whatItShows,
    primarySurface(demo),
    statusLinks(demo),
  ]);

  const archiveRows = archiveDemos.map((demo) => [
    `${link(demoNumber(demo.demoId), githubBlob(demo.videoPath))}<br>${demo.title}`,
    `\`${demo.maturity}\``,
    demo.whatItShows,
    statusLinks(demo),
  ]);

  return `# Demo Gallery

This file is generated from [\`manifest.json\`](manifest.json). Run
\`npm run demo:gen\` after editing the manifest.

This directory holds preview assets used by the README and user docs.
Treat these files as orientation aids, not as proof that every lane is
fully promoted.

The npm package ships this index and the provenance JSON, not the heavy
MP4/GIF media. Demo links below point to GitHub-hosted assets so
packaged docs stay usable without adding hundreds of megabytes.

Use [\`docs/user/showcase/README.md\`](../user/showcase/README.md) when
you want the fastest capability map. Use
[\`experiments/video-quality-review-demo\`](${githubBase}/experiments/video-quality-review-demo)
for the latest automated demo-video audit.

## Fast Picks

${table(['Demo', 'Why Watch', 'Next Step'], featuredRows)}

## Promotion Rules

- Keep MP4/GIF names stable: \`demo-N-short-slug.mp4\` and
  \`demo-N-short-slug.gif\`.
- Add every preview to [\`manifest.json\`](manifest.json) and
  [\`provenance.v1.json\`](provenance.v1.json).
- Link each public demo to a skill, flow, or example page; never only to
  this directory.
- Label maturity honestly: \`golden showcase\`, \`showcase candidate\`,
  \`supporting showcase candidate\`, \`proving candidate\`,
  \`experimental preview\`, or \`archive preview\`.
- Keep human source notes in [\`provenance/README.md\`](provenance/README.md).
- Promoted/golden demos must also have machine-readable
  \`assetLedgerPath\` and \`publishPrepProvenancePath\` artifacts.
- Run \`npm run review:demo-videos\` before treating a new MP4 as
  promoted.
- Run \`npm run demo:check\` before linking a preview from the README,
  showcase gallery, or user examples.

## Current Public Previews

${table(['Demo', 'Maturity', 'What It Proves', 'Skill / Flow', 'Inspect'], publicRows)}

## Archive Previews

${table(['Demo', 'Maturity', 'Why It Stays Archived', 'Inspect'], archiveRows)}
`;
}

const manifest = readJson(manifestPath);
const nextReadme = await prettier.format(renderGallery(manifest), { parser: 'markdown' });

if (checkMode) {
  const currentReadme = readFileSync(readmePath, 'utf8');
  if (currentReadme !== nextReadme) {
    console.error('docs/demo/README.md is stale. Run npm run demo:gen.');
    process.exit(1);
  }
  console.log('Demo gallery README is up to date.');
} else {
  writeFileSync(readmePath, nextReadme);
  console.log('Generated docs/demo/README.md from docs/demo/manifest.json.');
}
