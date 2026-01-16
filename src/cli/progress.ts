import { createRequire } from 'module';
import { getCliRuntime } from './runtime';
import { writeStderrLine } from './output';

export interface SpinnerLike {
  text: string;
  start: (text?: string) => SpinnerLike;
  succeed: (text?: string) => SpinnerLike;
  fail: (text?: string) => SpinnerLike;
  stop: () => SpinnerLike;
}

class NullSpinner implements SpinnerLike {
  text: string;

  constructor(text: string) {
    this.text = text;
  }

  private setText(text?: string): void {
    if (text) this.text = text;
  }

  start(text?: string): SpinnerLike {
    this.setText(text);
    return this;
  }

  succeed(text?: string): SpinnerLike {
    return this.start(text);
  }

  fail(text?: string): SpinnerLike {
    return this.start(text);
  }

  stop(): SpinnerLike {
    return this;
  }
}

class LineSpinner implements SpinnerLike {
  text: string;

  constructor(text: string) {
    this.text = text;
  }

  private write(level: 'INFO' | 'ERROR', text?: string): SpinnerLike {
    if (text) this.text = text;
    writeStderrLine(`${level}: ${this.text}`);
    return this;
  }

  start(text?: string): SpinnerLike {
    return this.write('INFO', text);
  }

  succeed(text?: string): SpinnerLike {
    return this.start(text);
  }

  fail(text?: string): SpinnerLike {
    return this.write('ERROR', text);
  }

  stop(): SpinnerLike {
    return this;
  }
}

export function createSpinner(text: string): SpinnerLike {
  const runtime = getCliRuntime();

  if (runtime.json) {
    return new NullSpinner(text);
  }

  if (!runtime.isTty) {
    return new LineSpinner(text);
  }

  const nodeMajor = Number(process.versions.node.split('.')[0] ?? 0);
  if (nodeMajor < 20) {
    return new LineSpinner(text);
  }

  try {
    const require = createRequire(import.meta.url);
    const ora = require('ora') as typeof import('ora');
    const factory = 'default' in ora ? ora.default : ora;
    return factory({ text, isEnabled: true, stream: process.stderr });
  } catch {
    return new LineSpinner(text);
  }
}
