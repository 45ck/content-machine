import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

function getChangedFiles() {
  const raw = process.env.CM_PRETTIER_CHECK_FILES ?? '';
  return raw
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function main() {
  const files = getChangedFiles();
  if (files.length === 0) {
    process.stdout.write('No changed files for Prettier push check.\n');
    return;
  }

  const require = createRequire(import.meta.url);
  const prettier = require('prettier');
  const prettierBin = require.resolve('prettier/bin/prettier.cjs');
  const supportedFiles = [];

  for (const file of files) {
    const info = await prettier.getFileInfo(file, { resolveConfig: false });
    if (!info.ignored && info.inferredParser) {
      supportedFiles.push(file);
    }
  }

  if (supportedFiles.length === 0) {
    process.stdout.write('No Prettier-supported changed files for push check.\n');
    return;
  }

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [prettierBin, '--check', ...supportedFiles], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`Prettier check failed with exit code ${code ?? 1}`));
    });
    child.on('error', reject);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
