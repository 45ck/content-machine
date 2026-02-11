import fs from 'node:fs';
import path from 'node:path';

// Vitest's v8 coverage provider can leave partial state behind when interrupted.
// Cleaning ensures deterministic coverage runs (especially in CI / quality gates).
const coverageDir = path.resolve(process.cwd(), 'coverage');

try {
  fs.rmSync(coverageDir, { recursive: true, force: true });
} catch {
  // Best-effort: if the directory doesn't exist or cannot be removed, let vitest handle it.
}

// Vitest v8 coverage writes into `${reportsDirectory}/.tmp`. Ensure it exists up-front to
// avoid rare ENOENT writes in forked pool mode.
try {
  fs.mkdirSync(path.join(coverageDir, '.tmp'), { recursive: true });
} catch {
  // Best-effort: if we can't create it, vitest will attempt to.
}
