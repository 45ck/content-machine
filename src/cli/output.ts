import { writeSync } from 'fs';

type OutputWriter = (fd: number, content: string) => void;

let outputWriterOverride: OutputWriter | null = null;

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

export function setOutputWriter(writer: OutputWriter | null): void {
  outputWriterOverride = writer;
}

function writeToFd(fd: number, content: string): void {
  if (outputWriterOverride) {
    outputWriterOverride(fd, content);
    return;
  }
  writeSync(fd, content);
}

export function writeStdout(content: string): void {
  writeToFd(process.stdout.fd, content);
}

export function writeStdoutLine(line: string): void {
  writeStdout(`${line}\n`);
}

export function writeStderr(content: string): void {
  writeToFd(process.stderr.fd, content);
}

export function writeStderrLine(line: string): void {
  writeStderr(`${line}\n`);
}

export function writeJsonEnvelope(envelope: CliJsonEnvelope): void {
  const content = JSON.stringify(envelope, null, 2);
  writeStdout(`${content}\n`);
}
