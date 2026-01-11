import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolveWhisperDir, resolveWhisperModelFilename } from './whisper';

export type RequirementKind = 'dependency' | 'asset';
export type RequirementSeverity = 'required' | 'optional';

export type RequirementCheckResult = { ok: boolean; detail?: string };

export type Requirement = {
  id: string;
  label: string;
  kind: RequirementKind;
  severity: RequirementSeverity;
  check: () => Promise<RequirementCheckResult>;
  fix?: string;
};

export type RequirementEvaluation = {
  id: string;
  label: string;
  kind: RequirementKind;
  severity: RequirementSeverity;
  ok: boolean;
  detail?: string;
  fix?: string;
};

export async function evaluateRequirements(
  requirements: Requirement[]
): Promise<RequirementEvaluation[]> {
  return Promise.all(
    requirements.map(async (requirement) => {
      const result = await requirement.check();
      return {
        id: requirement.id,
        label: requirement.label,
        kind: requirement.kind,
        severity: requirement.severity,
        ok: result.ok,
        detail: result.detail,
        fix: requirement.fix,
      };
    })
  );
}

function resolveWhisperExecutableCandidates(dir: string): string[] {
  const candidates: string[] = [];

  // whisper.cpp <= 1.7.3
  candidates.push(path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main'));

  // whisper.cpp >= 1.7.4
  candidates.push(
    path.join(dir, 'build', 'bin', process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli')
  );

  return candidates;
}

export function planWhisperRequirements(params: {
  required: boolean;
  model: string;
  dir?: string;
  version?: string;
}): Requirement[] {
  if (!params.required) return [];

  const dir = params.dir ? path.resolve(params.dir) : resolveWhisperDir();
  const modelFilename = resolveWhisperModelFilename(params.model);
  const modelPath = path.join(dir, modelFilename);
  const executableCandidates = resolveWhisperExecutableCandidates(dir);
  const version = params.version ?? '1.5.5';

  const fix = `Run: cm setup whisper --model ${params.model} --dir ${dir} --version ${version}`;

  return [
    {
      id: `whisper:model:${params.model}`,
      label: 'Whisper model',
      kind: 'dependency',
      severity: 'required',
      fix,
      check: async () => ({
        ok: existsSync(modelPath),
        detail: modelPath,
      }),
    },
    {
      id: 'whisper:binary',
      label: 'Whisper binary',
      kind: 'dependency',
      severity: 'required',
      fix,
      check: async () => ({
        ok: executableCandidates.some((candidate) => existsSync(candidate)),
        detail: executableCandidates.join(' | '),
      }),
    },
  ];
}
