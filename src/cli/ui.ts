import chalk from 'chalk';
import { getCliRuntime } from './runtime';
import { writeStderrLine } from './output';

const ASCII_BORDER = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|',
};

type BoxenModule = (text: string, options?: Record<string, unknown>) => string;

let cachedBoxen: BoxenModule | null | undefined;

async function loadBoxen(): Promise<BoxenModule | null> {
  if (cachedBoxen !== undefined) return cachedBoxen;
  try {
    const mod = await import('boxen');
    cachedBoxen = (mod as { default: BoxenModule }).default;
  } catch {
    cachedBoxen = null;
  }
  return cachedBoxen;
}

export function formatKeyValueRows(rows: Array<[string, string]>): string[] {
  const width = rows.reduce((max, [key]) => Math.max(max, key.length), 0);
  return rows.map(([key, value]) => `${key.padEnd(width)} : ${value}`);
}

export async function writeSummaryCard(params: {
  title: string;
  lines: string[];
  footerLines?: string[];
}): Promise<void> {
  const runtime = getCliRuntime();
  if (runtime.json) return;

  const bodyLines = [chalk.bold(params.title), ...params.lines];
  if (params.footerLines && params.footerLines.length > 0) {
    bodyLines.push('', ...params.footerLines);
  }
  const outputLines = bodyLines.filter((line) => line !== undefined && line !== null);

  if (!runtime.isTty) {
    outputLines.forEach((line) => writeStderrLine(line));
    return;
  }

  const boxen = await loadBoxen();
  if (!boxen) {
    outputLines.forEach((line) => writeStderrLine(line));
    return;
  }

  const content = outputLines.join('\n');
  const boxed = boxen(content, {
    padding: { top: 1, bottom: 1, left: 2, right: 2 },
    margin: { top: 1, bottom: 1 },
    borderStyle: ASCII_BORDER,
  });
  process.stderr.write(`${boxed}\n`);
}
