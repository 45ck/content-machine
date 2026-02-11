import { execFileSync } from 'node:child_process';
import { readRepoFactsRegistry } from '../lib/repo-facts.mjs';

function main() {
  const { registry } = readRepoFactsRegistry({ repoRoot: process.cwd() });
  const markdownPaths = registry.quality.docsValidation?.markdownPaths ?? [];
  if (markdownPaths.length === 0) return;

  execFileSync('npx', ['--no-install', 'markdownlint-cli2', ...markdownPaths], {
    stdio: 'inherit',
  });
}

main();
