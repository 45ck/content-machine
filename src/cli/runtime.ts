export interface CliRuntime {
  json: boolean;
  verbose: boolean;
  offline: boolean;
  yes: boolean;
  isTty: boolean;
  startTime: number;
  command?: string;
}

const runtime: CliRuntime = {
  json: false,
  verbose: false,
  offline: false,
  yes: false,
  isTty: Boolean(process.stderr.isTTY),
  startTime: Date.now(),
  command: undefined,
};

export function setCliRuntime(update: Partial<CliRuntime>): void {
  Object.assign(runtime, update);
}

export function getCliRuntime(): CliRuntime {
  return runtime;
}

export function resetCliRuntime(): void {
  runtime.json = false;
  runtime.verbose = false;
  runtime.offline = false;
  runtime.yes = false;
  runtime.isTty = Boolean(process.stderr.isTTY);
  runtime.startTime = Date.now();
  runtime.command = undefined;
}

export function getElapsedMs(): number {
  return Date.now() - runtime.startTime;
}
