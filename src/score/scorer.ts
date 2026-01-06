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
  /\byou('|’)?re an idiot\b/i,
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

function checkTitlePresent(title: string): ScoreCheck {
  const present = Boolean(title.trim());
  return {
    checkId: 'title-present',
    passed: present,
    severity: 'error',
    message: present ? 'Title present' : 'Missing title',
    fix: 'set-title',
  };
}

function checkTitleMatchesPackaging(title: string, packaging: PackageOutput): ScoreCheck {
  const expected = packaging.selected.title;
  const passed = title.trim() === expected.trim();
  return {
    checkId: 'title-matches-packaging',
    passed,
    severity: 'error',
    message: passed ? 'Title matches packaging' : 'Title does not match selected packaging title',
    fix: 're-run-script-with-package',
    details: { expected, actual: title },
  };
}

function checkNoRageBait(text: string): ScoreCheck {
  const rage = containsRageBait(text);
  return {
    checkId: 'no-rage-bait',
    passed: !rage,
    severity: 'error',
    message: rage ? 'Detected rage-bait / insulting framing' : 'No rage-bait patterns detected',
    fix: rage ? 'rewrite-to-neutral-tone' : undefined,
  };
}

function checkHookWordCount(hookWords: number): ScoreCheck {
  return {
    checkId: 'hook-word-count',
    passed: hookWords >= 3 && hookWords <= 18,
    severity: 'warning',
    message: `Hook length ${hookWords} words`,
    details: { hookWords, target: [3, 18] },
  };
}

function checkSceneCount(sceneCount: number): ScoreCheck {
  return {
    checkId: 'scene-count',
    passed: sceneCount >= 3 && sceneCount <= 12,
    severity: 'warning',
    message: `Scene count ${sceneCount}`,
    details: { sceneCount, target: [3, 12] },
  };
}

function checkEstimatedDuration(estimatedDuration: number): ScoreCheck {
  return {
    checkId: 'estimated-duration',
    passed: estimatedDuration >= 15 && estimatedDuration <= 60,
    severity: 'warning',
    message: `Estimated duration ${estimatedDuration.toFixed(1)}s`,
    details: { estimatedDuration, target: [15, 60] },
  };
}

function scoreDimensions(params: {
  titleWords: number;
  hookWords: number;
  sceneCount: number;
  estimatedDuration: number;
  hasRageBait: boolean;
}): Record<string, number> {
  return {
    title: scoreRange(params.titleWords, 6, 14),
    hook: scoreRange(params.hookWords, 3, 12),
    structure: clamp01(
      scoreRange(params.sceneCount, 3, 10) * scoreRange(params.estimatedDuration, 20, 60)
    ),
    safety: params.hasRageBait ? 0 : 1,
  };
}

function scoreOverall(dimensions: Record<string, number>): number {
  return clamp01(
    (dimensions.title ?? 0) * 0.25 +
      (dimensions.hook ?? 0) * 0.35 +
      (dimensions.structure ?? 0) * 0.25 +
      (dimensions.safety ?? 0) * 0.15
  );
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

  checks.push(checkTitlePresent(title));

  if (inputs.packaging) {
    checks.push(checkTitleMatchesPackaging(title, inputs.packaging));
  }

  const rageCheck = checkNoRageBait(allText);
  checks.push(rageCheck);
  checks.push(checkHookWordCount(hookWords));
  checks.push(checkSceneCount(sceneCount));
  checks.push(checkEstimatedDuration(estimatedDuration));

  const dimensions = scoreDimensions({
    titleWords,
    hookWords,
    sceneCount,
    estimatedDuration,
    hasRageBait: !rageCheck.passed,
  });

  const overall = scoreOverall(dimensions);

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
