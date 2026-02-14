import type { SafetyGateResult } from '../domain';
import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from './python-json';

export interface SafetyCheckResult {
  visualSafety: { passed: boolean; flags: string[]; method?: string };
  textSafety: { passed: boolean; flags: string[] };
}

export interface SafetyAnalyzer {
  analyze(videoPath: string, scriptPath?: string): Promise<SafetyCheckResult>;
}

/** Runs the content safety gate, failing if any visual or text safety flags are raised. */
export function runSafetyGate(result: SafetyCheckResult): SafetyGateResult {
  const passed = result.visualSafety.passed && result.textSafety.passed;

  const allFlags: string[] = [
    ...result.visualSafety.flags.map((f) => `visual: ${f}`),
    ...result.textSafety.flags.map((f) => `text: ${f}`),
  ];

  return {
    gateId: 'safety',
    passed,
    severity: 'error',
    fix: passed ? 'none' : 'review-content',
    message: passed ? 'Safety check passed' : `Safety issues found: ${allFlags.join('; ')}`,
    details: {
      visualPassed: result.visualSafety.passed,
      textPassed: result.textSafety.passed,
      visualFlags: result.visualSafety.flags,
      textFlags: result.textSafety.flags,
      method: result.visualSafety.method ?? 'unknown',
    },
  };
}

function parseSafetyJson(data: unknown): SafetyCheckResult {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid safety JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;
  const visual = obj['visualSafety'] as Record<string, unknown> | undefined;
  const text = obj['textSafety'] as Record<string, unknown> | undefined;

  if (!visual || typeof visual !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid safety JSON (missing visualSafety)');
  }
  if (!text || typeof text !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid safety JSON (missing textSafety)');
  }

  return {
    visualSafety: {
      passed: Boolean(visual['passed']),
      flags: Array.isArray(visual['flags']) ? visual['flags'].map(String) : [],
      method: typeof visual['method'] === 'string' ? visual['method'] : undefined,
    },
    textSafety: {
      passed: Boolean(text['passed']),
      flags: Array.isArray(text['flags']) ? text['flags'].map(String) : [],
    },
  };
}

/** Checks video and script content for safety issues using a CLIP-based Python classifier. */
export class ClipSafetyAnalyzer implements SafetyAnalyzer {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;

  constructor(options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath = options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'safety_check.py');
    this.timeoutMs = options?.timeoutMs ?? 120_000;
  }

  async analyze(videoPath: string, contentScriptPath?: string): Promise<SafetyCheckResult> {
    const args = ['--video', videoPath];
    if (contentScriptPath) {
      args.push('--script', contentScriptPath);
    }
    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args,
      timeoutMs: this.timeoutMs,
    });
    return parseSafetyJson(data);
  }
}
