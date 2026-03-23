import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { readRepoFactsRegistry } from '../lib/repo-facts.mjs';

function resolveMarkdownlint(repoRoot) {
  // On Windows, execFileSync doesn't resolve .cmd extensions without shell:true.
  // Use the local binary directly instead of going through npx.
  const ext = process.platform === 'win32' ? '.cmd' : '';
  return path.join(repoRoot, 'node_modules', '.bin', `markdownlint-cli2${ext}`);
}

function main() {
  const repoRoot = process.cwd();
  const { registry } = readRepoFactsRegistry({ repoRoot });
  const markdownPaths = registry.quality.docsValidation?.markdownPaths ?? [];
  if (markdownPaths.length === 0) return;

  // .cmd files require shell:true on Windows (cmd.exe processes .cmd extensions).
  // Quote the binary path to handle directory names with spaces.
  const bin = resolveMarkdownlint(repoRoot);
  const cmd = process.platform === 'win32' ? `"${bin}"` : bin;
  execFileSync(cmd, markdownPaths, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

main();
