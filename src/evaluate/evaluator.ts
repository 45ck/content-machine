import { validateVideoPath } from '../validate/validate';
import { rateSyncQuality, rateCaptionQuality } from '../score/sync-rater';
import { scoreScript } from '../score/scorer';
import type {
  EvaluationReport,
  EvaluationCheckResult,
  EvaluationThresholds,
  OverallScore,
  EvaluationMode,
} from '../domain';
import { MODE_CHECK_PRESETS } from '../domain';
import type { ScriptOutput } from '../domain';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { detectContentType } from '../validate/content-type';
import { TemporalAnalyzer, runTemporalQualityGate } from '../validate/temporal';
import { FfmpegAudioAnalyzer, runAudioSignalGate } from '../validate/audio-signal';
import { ClipSemanticAnalyzer } from '../score/semantic-fidelity';
import { ClipSafetyAnalyzer, runSafetyGate } from '../validate/safety';
import { FreezeAnalyzer, runFreezeGate } from '../validate/freeze';
import { FlowConsistencyAnalyzer, runFlowConsistencyGate } from '../validate/flow-consistency';
import { DnsmosAnalyzer } from '../score/dnsmos';
import { getValidateProfile } from '../validate/profiles';
import { analyzeFrameBounds, runFrameBoundsGate } from '../validate/frame-bounds';

export interface EvaluateVideoOptions {
  videoPath: string;
  scriptPath?: string;
  profile: 'portrait' | 'landscape';
  thresholds: EvaluationThresholds;
  mode?: EvaluationMode;
  checks: {
    validate?: boolean;
    rate?: boolean;
    captionQuality?: boolean;
    score?: boolean;
    temporalQuality?: boolean;
    audioSignal?: boolean;
    frameBounds?: boolean;
    semanticFidelity?: boolean;
    safety?: boolean;
    freeze?: boolean;
    dnsmos?: boolean;
    flowConsistency?: boolean;
  };
  fps?: number;
}

async function runCheck(
  checkId: EvaluationCheckResult['checkId'],
  fn: () => Promise<{ passed: boolean; summary: string; detail?: unknown }>
): Promise<EvaluationCheckResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return {
      checkId,
      passed: result.passed,
      skipped: false,
      summary: result.summary,
      durationMs: Date.now() - start,
      detail: result.detail,
    };
  } catch (err) {
    return {
      checkId,
      passed: false,
      skipped: false,
      error: err instanceof Error ? err.message : String(err),
      summary: `Error: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Date.now() - start,
    };
  }
}

function skipCheck(
  checkId: EvaluationCheckResult['checkId'],
  reason: string
): EvaluationCheckResult {
  return { checkId, passed: true, skipped: true, summary: reason, durationMs: 0 };
}

function computeInputHash(videoPath: string): string | undefined {
  try {
    const stat = statSync(videoPath);
    if (stat.size > 500 * 1024 * 1024) return undefined; // skip hashing for files > 500MB
    const buf = readFileSync(videoPath);
    return createHash('sha256').update(buf).digest('hex');
  } catch {
    return undefined;
  }
}

/** Merges mode-based check presets with explicit check flags, with explicit flags taking priority. */
export function resolveChecks(
  mode: EvaluationMode | undefined,
  explicit: EvaluateVideoOptions['checks']
): Record<string, boolean> {
  const preset = mode ? { ...MODE_CHECK_PRESETS[mode] } : {};
  // Explicit flags override mode presets
  const merged: Record<string, boolean> = { ...preset };
  for (const [key, val] of Object.entries(explicit)) {
    if (val !== undefined) {
      merged[key] = val;
    }
  }
  return merged;
}

interface EnabledChecks {
  validate: boolean;
  rate: boolean;
  captionQuality: boolean;
  score: boolean;
  temporalQuality: boolean;
  audioSignal: boolean;
  frameBounds: boolean;
  semanticFidelity: boolean;
  safety: boolean;
  freeze: boolean;
  dnsmos: boolean;
  flowConsistency: boolean;
}

interface ContentTypeInfo {
  hasSpeech: boolean;
  hasMusic: boolean;
  hasCaptions: boolean;
}

function buildEnabledChecks(resolved: Record<string, boolean>): EnabledChecks {
  return {
    validate: resolved.validate !== false,
    rate: resolved.rate !== false,
    captionQuality: resolved.captionQuality !== false,
    score: resolved.score !== false,
    temporalQuality: resolved.temporalQuality !== false,
    audioSignal: resolved.audioSignal !== false,
    frameBounds: resolved.frameBounds !== false,
    semanticFidelity: resolved.semanticFidelity ?? false,
    safety: resolved.safety ?? false,
    freeze: resolved.freeze ?? false,
    dnsmos: resolved.dnsmos ?? false,
    flowConsistency: resolved.flowConsistency ?? false,
  };
}

function runParallelChecks(
  options: EvaluateVideoOptions,
  enabledChecks: EnabledChecks,
  skipped: EvaluationCheckResult[]
): Promise<EvaluationCheckResult>[] {
  const { videoPath, profile } = options;
  const parallel: Promise<EvaluationCheckResult>[] = [];

  if (enabledChecks.validate) {
    parallel.push(
      runCheck('validate', async () => {
        const report = await validateVideoPath(videoPath, { profile });
        const s = report.summary;
        return {
          passed: report.passed,
          summary: `${s.width}x${s.height}, ${s.durationSeconds.toFixed(0)}s, ${s.videoCodec}/${s.audioCodec}`,
          detail: report,
        };
      })
    );
  } else {
    skipped.push(skipCheck('validate', 'disabled'));
  }

  if (enabledChecks.score) {
    if (options.scriptPath) {
      parallel.push(
        runCheck('score', async () => {
          const script: ScriptOutput = JSON.parse(readFileSync(options.scriptPath!, 'utf-8'));
          const result = scoreScript({ script, scriptPath: options.scriptPath! });
          return {
            passed: result.passed,
            summary: `overall: ${result.overall.toFixed(2)}`,
            detail: result,
          };
        })
      );
    } else {
      skipped.push(skipCheck('score', 'no script provided'));
    }
  } else {
    skipped.push(skipCheck('score', 'disabled'));
  }

  if (enabledChecks.temporalQuality) {
    parallel.push(
      runCheck('temporalQuality', async () => {
        const analyzer = new TemporalAnalyzer();
        const evalProfile = getValidateProfile(profile);
        const summary = await analyzer.analyze(videoPath);
        const gate = runTemporalQualityGate(summary, evalProfile);
        return {
          passed: gate.passed,
          summary: `flicker ${gate.details.flickerScore.toFixed(2)}, dup ratio ${(gate.details.duplicateFrameRatio * 100).toFixed(1)}%`,
          detail: gate,
        };
      })
    );
  } else {
    skipped.push(skipCheck('temporalQuality', 'disabled'));
  }

  if (enabledChecks.audioSignal) {
    parallel.push(
      runCheck('audioSignal', async () => {
        const analyzer = new FfmpegAudioAnalyzer();
        const evalProfile = getValidateProfile(profile);
        const summary = await analyzer.analyze(videoPath);
        const gate = runAudioSignalGate(summary, evalProfile);
        return {
          passed: gate.passed,
          summary: `${gate.details.loudnessLUFS.toFixed(1)} LUFS, peak ${gate.details.truePeakDBFS.toFixed(1)} dBFS`,
          detail: gate,
        };
      })
    );
  } else {
    skipped.push(skipCheck('audioSignal', 'disabled'));
  }

  if (enabledChecks.frameBounds) {
    parallel.push(
      runCheck('frameBounds', async () => {
        const summary = await analyzeFrameBounds(videoPath, { frameCount: 5 });
        const gate = runFrameBoundsGate(summary);
        return {
          passed: gate.passed,
          summary: gate.summary,
          detail: gate,
        };
      })
    );
  } else {
    skipped.push(skipCheck('frameBounds', 'disabled'));
  }

  return parallel;
}

function runRateChecks(
  options: EvaluateVideoOptions,
  enabledChecks: EnabledChecks,
  contentType: ContentTypeInfo
): Promise<EvaluationCheckResult[]> {
  return runRateChecksImpl(options, enabledChecks, contentType);
}

async function runRateChecksImpl(
  options: EvaluateVideoOptions,
  enabledChecks: EnabledChecks,
  contentType: ContentTypeInfo
): Promise<EvaluationCheckResult[]> {
  const { videoPath, thresholds } = options;
  const results: EvaluationCheckResult[] = [];

  if (
    enabledChecks.rate &&
    !options.checks.rate &&
    !contentType.hasSpeech &&
    !contentType.hasCaptions
  ) {
    results.push(skipCheck('rate', 'no speech/captions detected'));
    if (enabledChecks.captionQuality)
      results.push(skipCheck('captionQuality', 'no speech/captions detected'));
    return results;
  }

  if (enabledChecks.rate) {
    results.push(
      await runCheck('rate', async () => {
        const result = await rateSyncQuality(videoPath, options.fps ? { fps: options.fps } : {});
        const passed =
          thresholds.minSyncRating == null || result.rating >= thresholds.minSyncRating;
        return {
          passed,
          summary: `${result.rating}/100, ${result.ratingLabel}, mean drift ${result.metrics.meanDriftMs.toFixed(0)}ms`,
          detail: result,
        };
      })
    );
    if (enabledChecks.captionQuality) results.push(skipCheck('captionQuality', 'included in rate'));
    return results;
  }

  results.push(skipCheck('rate', 'disabled'));
  if (
    enabledChecks.captionQuality &&
    !options.checks.captionQuality &&
    !contentType.hasSpeech &&
    !contentType.hasCaptions
  ) {
    results.push(skipCheck('captionQuality', 'no speech/captions detected'));
  } else if (enabledChecks.captionQuality) {
    results.push(
      await runCheck('captionQuality', async () => {
        const result = await rateCaptionQuality(videoPath, options.fps ? { fps: options.fps } : {});
        const overallObj = result.captionQuality.overall;
        const overallScore = typeof overallObj === 'number' ? overallObj : overallObj.score;
        const passed =
          thresholds.minCaptionOverall == null || overallScore >= thresholds.minCaptionOverall;
        return { passed, summary: `overall: ${overallScore.toFixed(2)}`, detail: result };
      })
    );
  } else {
    results.push(skipCheck('captionQuality', 'disabled'));
  }
  return results;
}

async function runOptionalChecks(
  options: EvaluateVideoOptions,
  enabledChecks: EnabledChecks,
  contentType: ContentTypeInfo
): Promise<EvaluationCheckResult[]> {
  const { videoPath, thresholds } = options;
  const results: EvaluationCheckResult[] = [];

  // Semantic fidelity
  if (enabledChecks.semanticFidelity) {
    if (options.scriptPath) {
      results.push(
        await runCheck('semanticFidelity', async () => {
          const analyzer = new ClipSemanticAnalyzer();
          const result = await analyzer.analyze(videoPath, options.scriptPath!);
          return {
            passed: result.clipScore.mean >= (thresholds.minClipScore ?? 0),
            summary: `CLIP mean ${result.clipScore.mean.toFixed(3)}, min ${result.clipScore.min.toFixed(3)}, scenes ${result.scenesEvaluated}`,
            detail: result,
          };
        })
      );
    } else {
      results.push(skipCheck('semanticFidelity', 'no script provided'));
    }
  } else {
    results.push(skipCheck('semanticFidelity', 'disabled'));
  }

  // Safety
  if (enabledChecks.safety) {
    results.push(
      await runCheck('safety', async () => {
        const analyzer = new ClipSafetyAnalyzer();
        const result = await analyzer.analyze(videoPath, options.scriptPath);
        const gate = runSafetyGate(result);
        return {
          passed: gate.passed,
          summary: gate.passed
            ? 'No safety issues detected'
            : `${gate.details.visualFlags.length + gate.details.textFlags.length} issue(s) found`,
          detail: gate,
        };
      })
    );
  } else {
    results.push(skipCheck('safety', 'disabled'));
  }

  // Freeze
  if (enabledChecks.freeze) {
    results.push(
      await runCheck('freeze', async () => {
        const analyzer = new FreezeAnalyzer();
        const result = await analyzer.analyze(videoPath);
        const gate = runFreezeGate(result);
        return {
          passed: gate.passed,
          summary: `freeze ratio ${(gate.details.freezeRatio * 100).toFixed(1)}%, black ratio ${(gate.details.blackRatio * 100).toFixed(1)}%`,
          detail: gate,
        };
      })
    );
  } else {
    results.push(skipCheck('freeze', 'disabled'));
  }

  // DNSMOS
  if (enabledChecks.dnsmos && !options.checks.dnsmos && !contentType.hasSpeech) {
    results.push(skipCheck('dnsmos', 'no speech detected'));
  } else if (enabledChecks.dnsmos) {
    results.push(
      await runCheck('dnsmos', async () => {
        const analyzer = new DnsmosAnalyzer();
        const result = await analyzer.analyze(videoPath);
        return {
          passed: result.ovrlMos >= 3.0,
          summary: `DNSMOS ovrl=${result.ovrlMos.toFixed(2)}, sig=${result.sigMos.toFixed(2)}, bak=${result.bakMos.toFixed(2)}`,
          detail: result,
        };
      })
    );
  } else {
    results.push(skipCheck('dnsmos', 'disabled'));
  }

  // Flow consistency
  if (enabledChecks.flowConsistency) {
    results.push(
      await runCheck('flowConsistency', async () => {
        const analyzer = new FlowConsistencyAnalyzer();
        const result = await analyzer.analyze(videoPath);
        const gate = runFlowConsistencyGate(result);
        return {
          passed: gate.passed,
          summary: `mean warp error ${gate.details.meanWarpError.toFixed(4)}, max ${gate.details.maxWarpError.toFixed(4)}`,
          detail: gate,
        };
      })
    );
  } else {
    results.push(skipCheck('flowConsistency', 'disabled'));
  }

  return results;
}

/** Runs all enabled evaluation checks against a video and returns a comprehensive report. */
export async function evaluateVideo(options: EvaluateVideoOptions): Promise<EvaluationReport> {
  const startTime = Date.now();
  const { videoPath, thresholds } = options;
  const mode = options.mode ?? undefined;
  const resolved = resolveChecks(mode, options.checks);
  const enabledChecks = buildEnabledChecks(resolved);

  const skipped: EvaluationCheckResult[] = [];
  const parallel = runParallelChecks(options, enabledChecks, skipped);
  const checks: EvaluationCheckResult[] = [...skipped, ...(await Promise.all(parallel))];

  let contentType: ContentTypeInfo = { hasSpeech: true, hasMusic: false, hasCaptions: true };
  try {
    contentType = await detectContentType(videoPath);
  } catch {
    /* default */
  }

  checks.push(...(await runRateChecks(options, enabledChecks, contentType)));
  checks.push(...(await runOptionalChecks(options, enabledChecks, contentType)));

  const passed = checks.every((c) => c.passed);
  const overall = computeOverallScore(checks);
  const inputHash = computeInputHash(videoPath);

  return {
    schemaVersion: '1.0.0',
    videoPath,
    passed,
    mode,
    inputHash,
    checks,
    thresholds,
    overall,
    totalDurationMs: Date.now() - startTime,
    createdAt: new Date().toISOString(),
  };
}

const CHECK_WEIGHTS: Record<string, number> = {
  validate: 0.15,
  rate: 0.2,
  captionQuality: 0.08,
  score: 0.12,
  temporalQuality: 0.08,
  audioSignal: 0.08,
  frameBounds: 0.07,
  semanticFidelity: 0.08,
  freeze: 0.06,
  dnsmos: 0.08,
  flowConsistency: 0.07,
};

function computeOverallScore(checks: EvaluationCheckResult[]): OverallScore {
  let weightedSum = 0;
  let totalWeight = 0;
  let activeCoverage = 0;

  for (const check of checks) {
    if (check.skipped) continue;

    // Safety is a hard gate — not included in weighted score
    if (check.checkId === 'safety') continue;

    const weight = CHECK_WEIGHTS[check.checkId] ?? 0.05;
    const checkScore = check.passed ? 1.0 : 0.0;
    weightedSum += checkScore * weight;
    totalWeight += weight;
    activeCoverage++;
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Safety hard gate overrides
  const safetyCheck = checks.find((c) => c.checkId === 'safety');
  const safetyFailed = safetyCheck && !safetyCheck.skipped && !safetyCheck.passed;

  const finalScore = safetyFailed ? 0 : score;

  const label: 'good' | 'borderline' | 'bad' =
    finalScore >= 0.7 ? 'good' : finalScore >= 0.4 ? 'borderline' : 'bad';

  // Confidence based on how many checks actually ran
  const totalPossible = Object.keys(CHECK_WEIGHTS).length;
  const confidence = Math.min(1, activeCoverage / totalPossible);

  return {
    score: Math.round(finalScore * 1000) / 1000,
    label,
    confidence: Math.round(confidence * 100) / 100,
  };
}
