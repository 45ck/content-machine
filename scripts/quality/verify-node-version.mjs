import process from 'node:process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseVersion(version) {
  const match = String(version)
    .trim()
    .match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;

  const major = Number.parseInt(match[1] ?? '', 10);
  const minor = Number.parseInt(match[2] ?? '0', 10);
  const patch = Number.parseInt(match[3] ?? '0', 10);
  if (![major, minor, patch].every(Number.isFinite)) return null;

  return { major, minor, patch };
}

function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function readRequiredVersion() {
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
  const raw = String(pkg?.engines?.node ?? '').replace(/^>=\s*/, '');
  return parseVersion(raw);
}

const current = parseVersion(process.versions.node);
if (current === null) {
  console.error(`content-machine: unable to parse Node version: ${process.versions.node}`);
  process.exit(1);
}

const required = readRequiredVersion();
if (required === null) {
  console.error('content-machine: unable to parse required Node version from package.json.');
  process.exit(1);
}

if (compareVersions(current, required) < 0) {
  const requiredLabel = `${required.major}.${required.minor}.${required.patch}`;
  console.error(
    `content-machine: Node >= ${requiredLabel} required (found ${process.versions.node}).`
  );
  console.error(
    `Fix: run \`nvm use\` (repo includes \`.nvmrc\`), or install Node ${required.major}.x.`
  );
  process.exit(1);
}
