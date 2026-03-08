import path from 'node:path';
import { getWhisperRuntimeStatus, resolveWhisperDir } from './whisper';

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

export function planWhisperRequirements(params: {
  required: boolean;
  model: string;
  dir?: string;
  version?: string;
}): Requirement[] {
  if (!params.required) return [];

  const dir = params.dir ? path.resolve(params.dir) : resolveWhisperDir();
  const version = params.version ?? '1.5.5';
  const fix = getWhisperRuntimeStatus({ model: params.model, dir, version }).fix;

  return [
    {
      id: `whisper:model:${params.model}`,
      label: 'Whisper model',
      kind: 'dependency',
      severity: 'required',
      fix,
      check: async () => ({
        ok: getWhisperRuntimeStatus({ model: params.model, dir, version }).modelPresent,
        detail: getWhisperRuntimeStatus({ model: params.model, dir, version }).modelPath,
      }),
    },
    {
      id: 'whisper:binary',
      label: 'Whisper binary',
      kind: 'dependency',
      severity: 'required',
      fix,
      check: async () => {
        const status = getWhisperRuntimeStatus({ model: params.model, dir, version });
        return {
          ok: status.binaryPresent,
          detail: status.executableCandidates.join(' | '),
        };
      },
    },
  ];
}
