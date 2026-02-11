import { promises as fs } from 'node:fs';

import v8CoverageModule from '@vitest/coverage-v8';
import { V8CoverageProvider } from '@vitest/coverage-v8/dist/provider.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readFileWithRetry(filename, { retries, delayMs }) {
  let attempt = 0;
  while (true) {
    try {
      return await fs.readFile(filename, 'utf-8');
    } catch (err) {
      // Vitest's coverage provider can race: it may start reading coverage files
      // before the corresponding suite's async write lands on disk. The file often
      // appears shortly after, so we retry ENOENT a few times.
      if (err && err.code === 'ENOENT' && attempt < retries) {
        attempt += 1;
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
}

class RetryingV8CoverageProvider extends V8CoverageProvider {
  async readCoverageFiles({ onFileRead, onFinished, onDebug }) {
    // Drain any pending async writes (and any that may get queued while we drain).
    // BaseCoverageProvider awaits a snapshot of `pendingPromises`, which is vulnerable
    // to races if suites report coverage slightly after `generateCoverage` begins.
    while (this.pendingPromises.length) {
      const pending = this.pendingPromises.splice(0);
      await Promise.all(pending);
    }

    for (const [projectName, coveragePerProject] of this.coverageFiles.entries()) {
      for (const [transformMode, coverageByTestfiles] of Object.entries(coveragePerProject)) {
        const filenames = Object.values(coverageByTestfiles);
        const project = this.ctx.getProjectByName(projectName);

        // Keep the same slicing behavior, but make file reads tolerant to late writes.
        for (const chunk of this.toSlices(filenames, this.options.processingConcurrency)) {
          if (onDebug.enabled) {
            onDebug('Reading coverage chunk: %d files', chunk.length);
          }

          await Promise.all(
            chunk.map(async (filename) => {
              const contents = await readFileWithRetry(filename, {
                retries: 20,
                delayMs: 25,
              });
              const coverage = JSON.parse(contents);
              onFileRead(coverage);
            })
          );
        }

        await onFinished(project, transformMode);
      }
    }
  }
}

export default {
  startCoverage: v8CoverageModule.startCoverage,
  takeCoverage: v8CoverageModule.takeCoverage,
  stopCoverage: v8CoverageModule.stopCoverage,
  getProvider() {
    return new RetryingV8CoverageProvider();
  },
};
