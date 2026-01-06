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
  process.stdout.write(`${content}\n`);
}

export function writeStderrLine(line: string): void {
  process.stderr.write(`${line}\n`);
}
