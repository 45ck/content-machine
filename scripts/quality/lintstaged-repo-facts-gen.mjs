import { execFileSync } from 'node:child_process';
import path from 'node:path';

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

function main() {
  const repoRoot = process.cwd();

  run(process.execPath, [path.join(repoRoot, 'scripts', 'gen-repo-facts.mjs')], { cwd: repoRoot });

  // Stage generated outputs so contributors don't have to remember them.
  const generated = [
    'docs/reference/REPO-FACTS.md',
    'docs/reference/ARTIFACT-CONTRACTS.md',
    'docs/reference/CONFIG-SURFACE.md',
    'docs/reference/QUALITY-GATES.md',
    'docs/reference/SECURITY-INVARIANTS.md',
    'docs/reference/CLI-CONTRACT.md',
    'docs/reference/PIPELINE-PRESETS.md',
    '.github/copilot-instructions.md',
    'CLAUDE.md',
    'src/domain/repo-facts.generated.ts',
    'config/cspell/repo-facts.txt',
  ];

  run('git', ['add', ...generated], { cwd: repoRoot });
}

main();
