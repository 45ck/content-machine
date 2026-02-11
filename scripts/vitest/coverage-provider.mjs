import v8CoverageModule from '@vitest/coverage-v8';
import { V8CoverageProvider } from '@vitest/coverage-v8/dist/provider.js';

const DEFAULT_PROJECT = 'default';

class RetryingV8CoverageProvider extends V8CoverageProvider {
  onAfterSuiteRun({ coverage, transformMode, projectName, testFiles }) {
    if (!coverage) return;

    if (transformMode !== 'web' && transformMode !== 'ssr' && transformMode !== 'browser') {
      throw new Error(`Invalid transform mode: ${transformMode}`);
    }

    const key = projectName || DEFAULT_PROJECT;
    let entry = this.coverageFiles.get(key);
    if (!entry) {
      entry = { web: {}, ssr: {}, browser: {} };
      this.coverageFiles.set(key, entry);
    }

    // Store coverage directly in memory to avoid flaky temp-file races.
    entry[transformMode][testFiles.join()] = coverage;
  }

  async readCoverageFiles({ onFileRead, onFinished, onDebug }) {
    for (const [projectName, coveragePerProject] of this.coverageFiles.entries()) {
      for (const [transformMode, coverageByTestfiles] of Object.entries(coveragePerProject)) {
        const chunks = Object.values(coverageByTestfiles);
        const project = this.ctx.getProjectByName(projectName);

        for (const chunk of this.toSlices(chunks, this.options.processingConcurrency)) {
          if (onDebug.enabled) {
            onDebug('Reading coverage chunk: %d entries', chunk.length);
          }

          for (const coverage of chunk) {
            onFileRead(coverage);
          }
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
