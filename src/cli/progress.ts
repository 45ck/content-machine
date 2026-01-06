import ora from 'ora';
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

  start(text?: string): SpinnerLike {
    if (text) this.text = text;
    return this;
  }

  succeed(text?: string): SpinnerLike {
    if (text) this.text = text;
    return this;
  }

  fail(text?: string): SpinnerLike {
    if (text) this.text = text;
    return this;
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

  start(text?: string): SpinnerLike {
    if (text) this.text = text;
    writeStderrLine(`INFO: ${this.text}`);
    return this;
  }

  succeed(text?: string): SpinnerLike {
    if (text) this.text = text;
    writeStderrLine(`INFO: ${this.text}`);
    return this;
  }

  fail(text?: string): SpinnerLike {
    if (text) this.text = text;
    writeStderrLine(`ERROR: ${this.text}`);
    return this;
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

  return ora({ text, isEnabled: true });
}
