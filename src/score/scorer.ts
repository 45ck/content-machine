import type { ScriptOutput } from '../script/schema';
import type { PackageOutput } from '../package/schema';
import type { ScoreCheck, ScoreOutput } from './schema';
import { SCORE_SCHEMA_VERSION, ScoreOutputSchema } from './schema';
import { SchemaError } from '../core/errors';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function scoreRange(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 1;
  const distance = value < min ? min - value : value - max;
  return clamp01(1 - distance / Math.max(min, max));
}

const RAGE_BAIT_PATTERNS: RegExp[] = [
  /\byou(’|'| a)?re (an )?idiot\b/i,
  /\b(stupid|dumb|moron)\b/i,
  /\beveryone (is|are) wrong\b/i,
  /\bthis will (make|change) you (hate|rage)\b/i,
];

function containsRageBait(text: string): boolean {
  return RAGE_BAIT_PATTERNS.some((re) => re.test(text));
}

export interface ScoreInputs {
  script: ScriptOutput;
  scriptPath: string;
  packaging?: PackageOutput;
  packagePath?: string;
}

export function scoreScript(inputs: ScoreInputs): ScoreOutput {
  const title = inputs.script.title ?? '';
  const hook = inputs.script.hook ?? inputs.script.scenes[0]?.text ?? '';
  const allText = [title, hook, ...inputs.script.scenes.map((s) => s.text), inputs.script.cta ?? '']
    .filter(Boolean)
    .join(' ');

  const checks: ScoreCheck[] = [];

  const titleWords = countWords(title);
  const hookWords = countWords(hook);
  const sceneCount = inputs.script.scenes.length;
  const wordCount = countWords(allText);
  const estimatedDuration = inputs.script.meta?.estimatedDuration ?? wordCount / 2.5;

  checks.push({
    checkId: 'title-present',
    passed: Boolean(title.trim()),
    severity: 'error',
    message: title.trim() ? 'Title present' : 'Missing title',
    fix: 'set-title',
  });

  if (inputs.packaging) {
    const expected = inputs.packaging.selected.title;
    const passed = title.trim() === expected.trim();
    checks.push({
      checkId: 'title-matches-packaging',
      passed,
      severity: 'error',
      message: passed ? 'Title matches packaging' : 'Title does not match selected packaging title',
      fix: 're-run-script-with-package',
      details: { expected, actual: title },
    });
  }

  const rage = containsRageBait(allText);
  checks.push({
    checkId: 'no-rage-bait',
    passed: !rage,
    severity: 'error',
    message: rage ? 'Detected rage-bait / insulting framing' : 'No rage-bait patterns detected',
    fix: rage ? 'rewrite-to-neutral-tone' : undefined,
  });

  checks.push({
    checkId: 'hook-word-count',
    passed: hookWords >= 3 && hookWords <= 18,
    severity: 'warning',
    message: `Hook length ${hookWords} words`,
    details: { hookWords, target: [3, 18] },
  });

  checks.push({
    checkId: 'scene-count',
    passed: sceneCount >= 3 && sceneCount <= 12,
    severity: 'warning',
    message: `Scene count ${sceneCount}`,
    details: { sceneCount, target: [3, 12] },
  });

  checks.push({
    checkId: 'estimated-duration',
    passed: estimatedDuration >= 15 && estimatedDuration <= 60,
    severity: 'warning',
    message: `Estimated duration ${estimatedDuration.toFixed(1)}s`,
    details: { estimatedDuration, target: [15, 60] },
  });

  const dimensions = {
    title: scoreRange(titleWords, 6, 14),
    hook: scoreRange(hookWords, 3, 12),
    structure: clamp01(scoreRange(sceneCount, 3, 10) * scoreRange(estimatedDuration, 20, 60)),
    safety: rage ? 0 : 1,
  };

  const overall = clamp01(
    dimensions.title * 0.25 +
      dimensions.hook * 0.35 +
      dimensions.structure * 0.25 +
      dimensions.safety * 0.15
  );

  const passed = checks.every((c) => c.passed || c.severity !== 'error');
  const output: ScoreOutput = {
    schemaVersion: SCORE_SCHEMA_VERSION,
    input: {
      scriptPath: inputs.scriptPath,
      packagePath: inputs.packagePath,
    },
    passed,
    overall,
    dimensions,
    checks,
    createdAt: new Date().toISOString(),
  };

  const validated = ScoreOutputSchema.safeParse(output);
  if (!validated.success) {
    throw new SchemaError('Score output failed validation', { issues: validated.error.errors });
  }

  return validated.data;
}

