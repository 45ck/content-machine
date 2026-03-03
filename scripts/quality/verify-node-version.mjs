import process from 'node:process';

function parseMajor(version) {
  const major = Number.parseInt(String(version).split('.')[0] ?? '', 10);
  return Number.isFinite(major) ? major : null;
}

const major = parseMajor(process.versions.node);
if (major === null) {
  console.error(`content-machine: unable to parse Node version: ${process.versions.node}`);
  process.exit(1);
}

if (major < 20) {
  console.error(`content-machine: Node >= 20 required (found ${process.versions.node}).`);
  console.error('Fix: run `nvm use` (repo includes `.nvmrc`), or install Node 20+.');
  process.exit(1);
}
