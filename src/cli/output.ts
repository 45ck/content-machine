import { writeSync } from 'fs';

export interface CliJsonEnvelope {
  schemaVersion: number;
  command: string;
  args?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  timingsMs?: number;
  warnings?: string[];
  errors: Array<{
    code: string;
    message: string;
    context?: Record<string, unknown>;
  }>;
}

export function buildJsonEnvelope(params: {
  command: string;
  args?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  timingsMs?: number;
  warnings?: string[];
  errors?: CliJsonEnvelope['errors'];
}): CliJsonEnvelope {
  return {
    schemaVersion: 1,
    command: params.command,
    args: params.args ?? {},
    outputs: params.outputs ?? {},
    timingsMs: params.timingsMs,
    warnings: params.warnings ?? [],
    errors: params.errors ?? [],
  };
}

export function writeJsonEnvelope(envelope: CliJsonEnvelope): void {
  const content = JSON.stringify(envelope, null, 2);
  writeStdout(`${content}\n`);
}

export function writeStdout(text: string): void {
  writeSync(1, text);
}

export function writeStdoutLine(line: string): void {
  writeStdout(`${line}\n`);
}

export function writeStderr(text: string): void {
  writeSync(2, text);
}

export function writeStderrLine(line: string): void {
  writeStderr(`${line}\n`);
}
