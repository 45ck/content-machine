#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..', '..');
const demoDir = join(repoRoot, 'docs', 'demo');
const manifestPath = join(demoDir, 'manifest.json');
const provenancePath = join(demoDir, 'provenance.v1.json');
const provenanceReadmePath = join(demoDir, 'provenance', 'README.md');
const demoReadmePath = join(demoDir, 'README.md');
const packageJsonPath = join(repoRoot, 'package.json');
const reviewSummaryPath = join(
  repoRoot,
  'experiments',
  'video-quality-review-demo',
  'summary.json'
);

const validMaturities = new Set([
  'golden showcase',
  'showcase candidate',
  'supporting showcase candidate',
  'proving candidate',
  'experimental preview',
  'archive preview',
]);

const validPublicUses = new Set(['promoted', 'candidate', 'supporting', 'experimental', 'archive']);
const blockingPublicUses = new Set(['promoted', 'candidate', 'supporting']);
const promotionEvidencePublicUses = new Set(['promoted']);

const errors = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message) {
  errors.push(message);
}

function rel(path) {
  return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
}

function assertExists(path, label) {
  if (!existsSync(path)) fail(`${label} is missing: ${rel(path)}`);
}

function pathWithoutHash(path) {
  return path.split('#')[0];
}

function compareManifestField(demoId, manifestDemo, provenanceDemo, field) {
  const manifestValue = manifestDemo[field] ?? null;
  const provenanceValue = provenanceDemo[field] ?? null;
  if (manifestValue !== provenanceValue) {
    fail(`${demoId} manifest ${field} does not match provenance ${field}.`);
  }
}

function readDemoJsonPath(demoId, demo, field, label, required) {
  const value = demo[field];
  if (!value || typeof value !== 'string') {
    if (required) fail(`${demoId} needs ${field} for ${label}.`);
    return null;
  }
  const resolved = join(repoRoot, value);
  if (!existsSync(resolved)) {
    fail(`${demoId} ${field} does not exist: ${value}`);
    return null;
  }
  try {
    return { path: value, resolved, json: readJson(resolved) };
  } catch (error) {
    fail(`${demoId} ${field} is not valid JSON: ${value} (${error.message})`);
    return null;
  }
}

function validateAssetLedger(demoId, artifact) {
  if (!artifact) return;
  const { json } = artifact;
  if (!Array.isArray(json.assets) || json.assets.length === 0) {
    fail(`${demoId} assetLedgerPath must point to an asset ledger with non-empty assets[].`);
    return;
  }
  for (const [index, asset] of json.assets.entries()) {
    for (const field of ['assetId', 'usageMode', 'reviewStatus']) {
      if (!asset[field] || typeof asset[field] !== 'string') {
        fail(`${demoId} machine asset ledger assets[${index}] missing ${field}.`);
      }
    }
  }
}

function validatePublishPrepProvenance(demoId, demo, artifact, assetLedgerArtifact, requiredPass) {
  if (!artifact) return;
  const { json } = artifact;
  if (typeof json.passed !== 'boolean') {
    fail(`${demoId} publishPrepProvenancePath must include boolean passed.`);
  }
  if (!json.summary || typeof json.summary !== 'object') {
    fail(`${demoId} publishPrepProvenancePath must include summary.`);
  }
  if (!Array.isArray(json.checks)) {
    fail(`${demoId} publishPrepProvenancePath must include checks[].`);
  }
  if (requiredPass && json.passed !== true) {
    fail(`${demoId} is promoted but publishPrepProvenancePath did not pass.`);
  }
  if (!requiredPass && json.passed === false && !demo.promotionBlockedReasons?.length) {
    fail(`${demoId} has failing publish-prep provenance but no promotionBlockedReasons.`);
  }

  const reviewedLedgerPath = json.summary?.assetLedgerPath;
  if (assetLedgerArtifact && typeof reviewedLedgerPath === 'string') {
    const reviewedLedgerRel = rel(resolve(repoRoot, reviewedLedgerPath));
    if (
      reviewedLedgerPath !== assetLedgerArtifact.path &&
      reviewedLedgerRel !== assetLedgerArtifact.path
    ) {
      fail(
        `${demoId} publishPrepProvenancePath summary.assetLedgerPath does not match assetLedgerPath.`
      );
    }
  }
}

assertExists(manifestPath, 'demo manifest');
assertExists(provenancePath, 'demo provenance manifest');
assertExists(provenanceReadmePath, 'demo provenance README');
assertExists(demoReadmePath, 'demo README');

const manifest = existsSync(manifestPath) ? readJson(manifestPath) : { demos: [] };
const provenance = existsSync(provenancePath) ? readJson(provenancePath) : { demos: [] };
const demoReadme = existsSync(demoReadmePath) ? readFileSync(demoReadmePath, 'utf8') : '';
const provenanceReadme = existsSync(provenanceReadmePath)
  ? readFileSync(provenanceReadmePath, 'utf8')
  : '';
const packageJson = readJson(packageJsonPath);
const reviewSummary = existsSync(reviewSummaryPath) ? readJson(reviewSummaryPath) : null;

if (manifest.schemaVersion !== 'demo-manifest.v1') {
  fail('docs/demo/manifest.json must use schemaVersion "demo-manifest.v1".');
}

if (!Array.isArray(manifest.demos)) {
  fail('docs/demo/manifest.json must include a demos array.');
}

if (provenance.schemaVersion !== 'demo-provenance.v1') {
  fail('docs/demo/provenance.v1.json must use schemaVersion "demo-provenance.v1".');
}

if (!Array.isArray(provenance.demos)) {
  fail('docs/demo/provenance.v1.json must include a demos array.');
}

const manifestEntries = new Map();
for (const demo of manifest.demos ?? []) {
  if (!demo.demoId || typeof demo.demoId !== 'string') {
    fail('every manifest entry needs demoId.');
    continue;
  }
  if (manifestEntries.has(demo.demoId)) fail(`duplicate manifest demoId: ${demo.demoId}`);
  manifestEntries.set(demo.demoId, demo);

  for (const field of [
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
      fail(`${demo.demoId} manifest entry missing ${field}.`);
    }
  }
  if (demo.provenanceNotesPath !== `docs/demo/provenance/README.md#${demo.demoId}`) {
    fail(`${demo.demoId} provenanceNotesPath must point to its provenance README heading.`);
  }
  if (demo.publicUse !== 'archive' && (!Array.isArray(demo.skills) || demo.skills.length === 0)) {
    fail(`${demo.demoId} is public-facing but has no manifest skills.`);
  }
  for (const skill of demo.skills ?? []) {
    if (!skill.name || typeof skill.name !== 'string') {
      fail(`${demo.demoId} manifest skill missing name.`);
    }
    if (!skill.path || typeof skill.path !== 'string') {
      fail(`${demo.demoId} manifest skill missing path.`);
    } else if (!existsSync(join(repoRoot, skill.path))) {
      fail(`${demo.demoId} manifest skill path does not exist: ${skill.path}`);
    }
  }
  for (const path of demo.flowPaths ?? []) {
    if (!existsSync(join(repoRoot, path))) {
      fail(`${demo.demoId} manifest flow path does not exist: ${path}`);
    }
  }
  for (const field of [
    'videoPath',
    'gifPath',
    'layoutPath',
    'sourceDoc',
    'reviewReportPath',
    'reproducePath',
    'assetLedgerPath',
    'publishPrepProvenancePath',
    'provenanceNotesPath',
  ]) {
    const value = demo[field];
    if (value && !existsSync(join(repoRoot, pathWithoutHash(value)))) {
      fail(`${demo.demoId} manifest ${field} does not exist: ${value}`);
    }
  }
}

const entries = new Map();
for (const demo of provenance.demos ?? []) {
  if (!demo.demoId || typeof demo.demoId !== 'string') {
    fail('every provenance entry needs demoId.');
    continue;
  }
  if (entries.has(demo.demoId)) fail(`duplicate provenance demoId: ${demo.demoId}`);
  entries.set(demo.demoId, demo);
}

const localMp4s = readdirSync(demoDir)
  .filter((name) => name.endsWith('.mp4'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

for (const fileName of localMp4s) {
  const demoId = fileName.replace(/\.mp4$/i, '');
  if (!entries.has(demoId)) {
    fail(`local demo MP4 lacks provenance entry: docs/demo/${fileName}`);
  }
  if (!manifestEntries.has(demoId)) {
    fail(`local demo MP4 lacks manifest entry: docs/demo/${fileName}`);
  }
}

for (const demoId of manifestEntries.keys()) {
  if (!entries.has(demoId)) {
    fail(`${demoId} has a manifest entry but no provenance entry.`);
  }
}

for (const [demoId, demo] of entries) {
  const manifestDemo = manifestEntries.get(demoId);
  if (!manifestDemo) {
    fail(`${demoId} has a provenance entry but no manifest entry.`);
  } else {
    for (const field of [
      'title',
      'maturity',
      'publicUse',
      'videoPath',
      'gifPath',
      'layoutPath',
      'sourceDoc',
      'reviewReportPath',
      'assetLedgerPath',
      'publishPrepProvenancePath',
    ]) {
      compareManifestField(demoId, manifestDemo, demo, field);
    }
  }
  if (!validMaturities.has(demo.maturity)) {
    fail(`${demoId} has invalid maturity: ${demo.maturity}`);
  }
  if (!validPublicUses.has(demo.publicUse)) {
    fail(`${demoId} has invalid publicUse: ${demo.publicUse}`);
  }
  if (!demo.videoPath || !existsSync(join(repoRoot, demo.videoPath))) {
    fail(`${demoId} videoPath is missing or does not exist.`);
  }
  if (demo.gifPath && !existsSync(join(repoRoot, demo.gifPath))) {
    fail(`${demoId} gifPath does not exist: ${demo.gifPath}`);
  }
  if (demo.layoutPath && !existsSync(join(repoRoot, demo.layoutPath))) {
    fail(`${demoId} layoutPath does not exist: ${demo.layoutPath}`);
  }
  if (!demo.sourceDoc || !existsSync(join(repoRoot, demo.sourceDoc))) {
    fail(`${demoId} sourceDoc is missing or does not exist.`);
  }
  if (!demo.reviewReportPath || !existsSync(join(repoRoot, demo.reviewReportPath))) {
    fail(`${demoId} reviewReportPath is missing or does not exist.`);
  }
  if (!demo.rightsStatus || typeof demo.rightsStatus !== 'string') {
    fail(`${demoId} needs rightsStatus.`);
  }
  if (!demo.reviewStatus || typeof demo.reviewStatus !== 'string') {
    fail(`${demoId} needs reviewStatus.`);
  }
  if (!Array.isArray(demo.assetLedger) || demo.assetLedger.length === 0) {
    fail(`${demoId} needs at least one assetLedger entry.`);
  }
  for (const [index, asset] of (demo.assetLedger ?? []).entries()) {
    for (const field of ['kind', 'usageMode', 'licenseStatus', 'contentIdRisk', 'summary']) {
      if (!asset[field] || typeof asset[field] !== 'string') {
        fail(`${demoId} assetLedger[${index}] missing ${field}.`);
      }
    }
  }
  if (demo.maturity === 'golden showcase' && demo.rightsStatus !== 'approved') {
    fail(`${demoId} is golden showcase but rightsStatus is not approved.`);
  }
  if (demo.maturity === 'golden showcase' && demo.reviewStatus !== 'pass') {
    fail(`${demoId} is golden showcase but reviewStatus is not pass.`);
  }
  if (blockingPublicUses.has(demo.publicUse) && demo.rightsStatus === 'unknown') {
    fail(`${demoId} is public-facing but rightsStatus is unknown.`);
  }
  if (demo.publicUse === 'experimental' && !demo.promotionBlockedReasons?.length) {
    fail(`${demoId} is experimental but lacks promotionBlockedReasons.`);
  }
  const requiresPromotionEvidence =
    promotionEvidencePublicUses.has(demo.publicUse) || demo.maturity === 'golden showcase';
  const assetLedgerArtifact = readDemoJsonPath(
    demoId,
    demo,
    'assetLedgerPath',
    'machine asset-ledger evidence',
    requiresPromotionEvidence
  );
  validateAssetLedger(demoId, assetLedgerArtifact);
  const publishPrepProvenanceArtifact = readDemoJsonPath(
    demoId,
    demo,
    'publishPrepProvenancePath',
    'publish-prep provenance evidence',
    requiresPromotionEvidence
  );
  validatePublishPrepProvenance(
    demoId,
    demo,
    publishPrepProvenanceArtifact,
    assetLedgerArtifact,
    requiresPromotionEvidence
  );
  if (!provenanceReadme.includes(`# ${demoId}`)) {
    fail(`${demoId} lacks a heading in docs/demo/provenance/README.md.`);
  }
}

const readmeSlugs = [...demoReadme.matchAll(/demo-\d+-[a-z0-9-]+\.mp4/g)].map((match) =>
  match[0].replace(/\.mp4$/i, '')
);
for (const slug of new Set(readmeSlugs)) {
  if (!entries.has(slug)) fail(`docs/demo/README.md links ${slug} without provenance.`);
  if (!demoReadme.includes(`provenance/README.md#${slug}`)) {
    fail(`docs/demo/README.md row for ${slug} must link to provenance notes.`);
  }
}

if (reviewSummary) {
  const reports = new Map(reviewSummary.reports.map((report) => [report.slug, report]));
  for (const [demoId, demo] of entries) {
    const report = reports.get(demoId);
    if (!report) {
      fail(`${demoId} is missing from ${rel(reviewSummaryPath)}.`);
      continue;
    }
    const hasError = report.issues?.some((issue) => issue.severity === 'error');
    if (hasError && demo.publicUse !== 'experimental') {
      fail(`${demoId} has error-level demo audit issues but is not experimental.`);
    }
  }
}

const packageFiles = packageJson.files ?? [];
for (const required of [
  'docs/demo/README.md',
  'docs/demo/manifest.json',
  'docs/demo/provenance.v1.json',
  'docs/demo/provenance/README.md',
  'docs/demo/provenance/**/*.json',
]) {
  if (!packageFiles.includes(required)) {
    fail(`package.json files must include ${required}.`);
  }
}
for (const forbidden of ['docs/demo/*.mp4', 'docs/demo/*.gif', 'docs/demo/**']) {
  if (packageFiles.includes(forbidden)) {
    fail(`package.json files should not include heavy demo media pattern: ${forbidden}`);
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(
  `Public demo check passed for ${entries.size} provenance entries and ${manifestEntries.size} manifest entries.`
);
