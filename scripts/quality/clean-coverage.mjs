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
