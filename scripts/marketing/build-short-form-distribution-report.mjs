#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    batchRoot: '',
    input: '',
    dueSoonDays: 7,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === '--batchRoot' || a === '--batch-root' || a === '--root' || a === '-r') {
      args.batchRoot = String(argv[i + 1] ?? '').trim();
      i += 1;
      continue;
    }

    if (a === '--input' || a === '-i') {
      args.input = String(argv[i + 1] ?? '').trim();
      i += 1;
      continue;
    }

    if (a === '--dueSoonDays' || a === '--due-soon-days') {
      const raw = String(argv[i + 1] ?? '').trim();
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(`Invalid --dueSoonDays value: ${raw}`);
      }
      args.dueSoonDays = n;
      i += 1;
      continue;
    }
  }

  return args;
}

function safeIso(msOrIso) {
  if (!msOrIso) return '';
  if (typeof msOrIso === 'number') return new Date(msOrIso).toISOString();
  const d = new Date(msOrIso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function compareDueAtAsc(a, b) {
  const aDue = a?.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
  const bDue = b?.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
  return aDue - bDue;
}

function csvCell(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function toCsvRow(cols) {
  return cols.map(csvCell).join(',');
}

async function readJson(p) {
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw);
}

function isReportShape(obj) {
  return Boolean(obj && typeof obj === 'object' && obj.metrics && typeof obj.metrics === 'object');
}

function coerceWindows(input) {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object' && Array.isArray(input.windows)) return input.windows;
  return null;
}

function normalizeWindow(win, { capturedAtIso, dueSoonDays }) {
  const dueAtIso = safeIso(win?.dueAt);
  const publishedUrl = win?.publishedUrl ? String(win.publishedUrl) : '';
  const windowId = win?.window != null ? String(win.window) : '';
  const platform = win?.platform != null ? String(win.platform) : '';
  const briefId = win?.briefId != null ? String(win.briefId) : '';
  const p = win?.path != null ? String(win.path) : '';

  let status = win?.status != null ? String(win.status) : '';
  if (!status) {
    if (publishedUrl) status = 'published';
    else if (dueAtIso) {
      const capturedMs = new Date(capturedAtIso).getTime();
      const dueMs = new Date(dueAtIso).getTime();
      const dueSoonMs = capturedMs + dueSoonDays * 24 * 60 * 60 * 1000;
      if (dueMs < capturedMs) status = 'overdue';
      else if (dueMs <= dueSoonMs) status = 'dueSoon';
      else status = 'upcoming';
    } else {
      status = 'unknown';
    }
  }

  return {
    briefId,
    platform,
    window: windowId,
    status,
    dueAt: dueAtIso,
    publishedUrl,
    path: p,
  };
}

function computeMetricsFromWindows(windows, { capturedAtIso, dueSoonDays }) {
  const normalized = windows.map((w) => normalizeWindow(w, { capturedAtIso, dueSoonDays }));

  const metrics = {
    windows: normalized,
    overdue: normalized.filter((w) => w.status === 'overdue'),
    dueSoon: normalized.filter((w) => w.status === 'dueSoon'),
    upcoming: normalized.filter((w) => w.status === 'upcoming'),
    published: normalized.filter((w) => w.status === 'published'),
    unknown: normalized.filter((w) => w.status === 'unknown'),
  };

  metrics.overdue.sort(compareDueAtAsc);
  metrics.dueSoon.sort(compareDueAtAsc);

  return metrics;
}

function buildMarkdownReport({ report, relativeTo }) {
  const capturedAt = report.capturedAt ? String(report.capturedAt) : '';
  const metrics = report.metrics ?? {};

  const overdue = Array.isArray(metrics.overdue) ? metrics.overdue : [];
  const dueSoon = Array.isArray(metrics.dueSoon) ? metrics.dueSoon : [];
  const windows = Array.isArray(metrics.windows) ? metrics.windows : [];

  const lines = [];
  lines.push('# Short-Form Distribution Report');
  lines.push('');
  if (capturedAt) lines.push(`- Captured at: \`${capturedAt}\``);
  lines.push(`- Total windows: \`${windows.length}\``);
  lines.push(`- Due soon: \`${dueSoon.length}\``);
  lines.push(`- Overdue: \`${overdue.length}\``);
  lines.push('');

  function section(title, items) {
    lines.push(`## ${title}`);
    lines.push('');
    if (items.length === 0) {
      lines.push('- (none)');
      lines.push('');
      return;
    }
    lines.push('| dueAt | briefId | platform | window | publishedUrl | path |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const w of items) {
      const relPath = w.path ? path.relative(relativeTo, path.resolve(relativeTo, w.path)) : '';
      lines.push(
        `| ${w.dueAt ? `\`${w.dueAt}\`` : ''} | \`${w.briefId ?? ''}\` | \`${w.platform ?? ''}\` | \`${w.window ?? ''}\` | ${w.publishedUrl ? `\`${w.publishedUrl}\`` : ''} | ${relPath ? `\`${relPath}\`` : ''} |`
      );
    }
    lines.push('');
  }

  section('Due Soon', dueSoon);
  section('Overdue', overdue);

  return lines.join('\n');
}

function collectWindowsForCsv(report) {
  const capturedAt = report?.capturedAt ? String(report.capturedAt) : '';
  const metrics = report?.metrics ?? {};

  const windows = [];
  if (Array.isArray(metrics.windows)) {
    for (const w of metrics.windows) windows.push(w);
  } else {
    for (const [key, value] of Object.entries(metrics)) {
      if (!Array.isArray(value)) continue;
      for (const w of value) {
        if (!w || typeof w !== 'object') continue;
        if (!('briefId' in w) && !('platform' in w) && !('dueAt' in w)) continue;
        windows.push(w.status ? w : { ...w, status: key });
      }
    }
  }

  const normalized = windows.map((w) =>
    normalizeWindow(w, { capturedAtIso: capturedAt || new Date().toISOString(), dueSoonDays: 0 })
  );

  // Preserve stable-ish ordering in CSV: dueAt asc, then brief/platform/window.
  normalized.sort((a, b) => {
    const d = compareDueAtAsc(a, b);
    if (d !== 0) return d;
    const ab = `${a.briefId}\u0000${a.platform}\u0000${a.window}`;
    const bb = `${b.briefId}\u0000${b.platform}\u0000${b.window}`;
    return ab.localeCompare(bb);
  });

  return { capturedAt, windows: normalized };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.batchRoot) {
    console.error('Missing required arg: --batchRoot <dir>');
    process.exitCode = 2;
    return;
  }

  const batchRootAbs = path.resolve(process.cwd(), args.batchRoot);
  const reportJsonPath = path.join(batchRootAbs, 'distribution-report.json');
  const reportMdPath = path.join(batchRootAbs, 'distribution-report.md');
  const reportCsvPath = path.join(batchRootAbs, 'distribution-report.csv');

  const inputPath = args.input
    ? path.resolve(process.cwd(), args.input)
    : existsSync(reportJsonPath)
      ? reportJsonPath
      : path.join(batchRootAbs, 'distribution-windows.json');

  let input;
  try {
    input = await readJson(inputPath);
  } catch (err) {
    console.error(`Failed to read input JSON: ${inputPath}`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 2;
    return;
  }

  const nowIso = new Date().toISOString();

  let report;
  if (isReportShape(input)) {
    report = { ...input };
    report.capturedAt = report.capturedAt ? safeIso(report.capturedAt) : nowIso;
    report.metrics = report.metrics ?? {};

    if (Array.isArray(report.metrics.overdue)) report.metrics.overdue.sort(compareDueAtAsc);
    if (Array.isArray(report.metrics.dueSoon)) report.metrics.dueSoon.sort(compareDueAtAsc);
  } else {
    const windows = coerceWindows(input);
    if (!windows) {
      console.error(`Input JSON is neither a report nor a windows list: ${inputPath}`);
      process.exitCode = 2;
      return;
    }
    const capturedAtIso = input?.capturedAt ? safeIso(input.capturedAt) : nowIso;
    report = {
      capturedAt: capturedAtIso,
      metrics: computeMetricsFromWindows(windows, { capturedAtIso, dueSoonDays: args.dueSoonDays }),
      source: {
        inputPath: path.relative(process.cwd(), inputPath),
      },
    };
  }

  await mkdir(batchRootAbs, { recursive: true });

  await writeFile(reportJsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  await writeFile(reportMdPath, buildMarkdownReport({ report, relativeTo: batchRootAbs }) + '\n', 'utf8');

  const { capturedAt, windows: csvWindows } = collectWindowsForCsv(report);
  const csvLines = [];
  csvLines.push(
    toCsvRow(['briefId', 'platform', 'window', 'status', 'dueAt', 'capturedAt', 'publishedUrl', 'path'])
  );
  for (const w of csvWindows) {
    csvLines.push(
      toCsvRow([
        w.briefId ?? '',
        w.platform ?? '',
        w.window ?? '',
        w.status ?? '',
        w.dueAt ?? '',
        capturedAt ?? '',
        w.publishedUrl ?? '',
        w.path ?? '',
      ])
    );
  }
  await writeFile(reportCsvPath, csvLines.join('\n') + '\n', 'utf8');

  // stdout is reserved for the primary artifact path (easy copy/paste).
  process.stdout.write(reportJsonPath + '\n');
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exitCode = 2;
});

