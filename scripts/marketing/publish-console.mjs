#!/usr/bin/env node
/**
 * Local-only distribution triage console.
 *
 * Serves a small web UI that reads files from `batch/`:
 * - publish-ready-index.md
 * - publish-ledger.csv
 * - metrics-snapshot-ledger.csv
 * - distribution-report.md
 *
 * No auth. No posting automation.
 */

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const args = {
    host: '127.0.0.1',
    port: 5123,
    batchDir: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--host') {
      args.host = String(argv[i + 1] ?? '').trim() || args.host;
      i += 1;
      continue;
    }
    if (a === '--port' || a === '-p') {
      const n = Number(argv[i + 1]);
      if (Number.isFinite(n) && n > 0) args.port = n;
      i += 1;
      continue;
    }
    if (a === '--batch-dir' || a === '--batch') {
      args.batchDir = String(argv[i + 1] ?? '').trim() || args.batchDir;
      i += 1;
      continue;
    }
  }

  return args;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function json(res, statusCode, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function text(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'content-type': contentType, 'cache-control': 'no-store' });
  res.end(body);
}

function guessMime(path) {
  const ext = extname(path).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.csv') return 'text/csv; charset=utf-8';
  if (ext === '.md') return 'text/markdown; charset=utf-8';
  if (ext === '.txt') return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Small CSV parser (RFC 4180-ish): supports quotes, commas, CRLF/LF.
function parseCsv(csvText) {
  const text = stripBom(String(csvText ?? ''));
  const rows = [];

  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    // Ignore final empty row from trailing newline.
    if (row.length === 1 && row[0] === '' && rows.length === 0) return;
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      pushField();
      i += 1;
      continue;
    }

    if (ch === '\n') {
      pushField();
      pushRow();
      i += 1;
      continue;
    }

    if (ch === '\r') {
      // Handle CRLF
      if (text[i + 1] === '\n') i += 1;
      pushField();
      pushRow();
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  pushField();
  pushRow();

  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => String(h ?? '').trim());
  const records = rows
    .slice(1)
    .filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''))
    .map((cells) => {
      const rec = {};
      for (let j = 0; j < headers.length; j += 1) {
        const key = headers[j] || `col_${j + 1}`;
        rec[key] = cells[j] ?? '';
      }
      return rec;
    });
  return { headers, records };
}

function normalizeKeyPart(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/[^\p{L}\p{N}:/._-]+/gu, '');
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && String(obj[k] ?? '').trim() !== '')
      return obj[k];
  }
  return '';
}

function pickKeyName(headers, candidates) {
  const lowered = new Map(headers.map((h) => [String(h).toLowerCase(), h]));
  for (const c of candidates) {
    const hit = lowered.get(String(c).toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function parseDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  // Numeric epoch (seconds or ms).
  if (/^\d{10,13}$/.test(raw)) {
    const n = Number(raw);
    const ms = raw.length === 10 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // ISO-ish strings parse well in JS; other formats are best-effort.
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function metricsStatusFromRecord(record, now, dueSoonHours) {
  const keys = Object.keys(record);
  const dueKey =
    pickKeyName(keys, [
      'metrics_due_at',
      'metrics_due',
      'next_metrics_at',
      'next_snapshot_at',
      'next_snapshot_due_at',
      'next_due_at',
      'due_at',
      'due',
    ]) ??
    pickKeyName(keys, ['metrics_due_date', 'next_due_date', 'due_date', 'next_snapshot_date']);

  const statusKey =
    pickKeyName(keys, ['metrics_status', 'snapshot_status', 'status']) ??
    pickKeyName(keys, ['metrics_due_status']);

  const statusRaw = statusKey ? String(record[statusKey] ?? '').trim().toLowerCase() : '';
  if (statusRaw === 'overdue' || statusRaw === 'due_soon' || statusRaw === 'due-soon') {
    return statusRaw === 'due-soon' ? 'due_soon' : statusRaw;
  }

  const dueAt = dueKey ? parseDate(record[dueKey]) : null;
  if (!dueAt) return null;

  const diffMs = dueAt.getTime() - now.getTime();
  if (diffMs < 0) return 'overdue';
  if (diffMs <= dueSoonHours * 60 * 60 * 1000) return 'due_soon';
  return null;
}

function distributionStatusFromRecord(record) {
  const keys = Object.keys(record);
  const statusKey =
    pickKeyName(keys, ['distribution_status', 'publish_status', 'status']) ??
    pickKeyName(keys, ['state', 'distribution_state']);
  const raw = statusKey ? String(record[statusKey] ?? '').trim() : '';
  const lowered = raw.toLowerCase();
  if (lowered === 'ready_for_manual_upload') return 'ready_for_manual_upload';
  if (lowered === 'published') return 'published';
  // Keep original for display but only filter on known statuses.
  return raw || '';
}

function deriveJoinKey(record) {
  const keys = Object.keys(record);
  const id = pickFirst(record, [
    pickKeyName(keys, ['distribution_id', 'post_id', 'external_id', 'video_id', 'short_id', 'id']),
    'distribution_id',
    'post_id',
    'external_id',
    'video_id',
    'short_id',
    'id',
  ].filter(Boolean));

  const url = pickFirst(record, [
    pickKeyName(keys, ['post_url', 'url', 'permalink', 'link']),
    'post_url',
    'url',
    'permalink',
    'link',
  ].filter(Boolean));

  const platform = pickFirst(record, [
    pickKeyName(keys, ['platform', 'channel', 'network', 'destination']),
    'platform',
    'channel',
    'network',
    'destination',
  ].filter(Boolean));

  // Prefer URL when present, otherwise platform+id, otherwise any stable id-ish field.
  if (String(url ?? '').trim()) return `url:${normalizeKeyPart(url)}`;
  if (String(id ?? '').trim()) return `id:${normalizeKeyPart(platform)}:${normalizeKeyPart(id)}`;

  const path = pickFirst(record, [
    pickKeyName(keys, ['video_path', 'artifact_path', 'path', 'output_path']),
    'video_path',
    'artifact_path',
    'path',
    'output_path',
  ].filter(Boolean));
  if (String(path ?? '').trim()) return `path:${normalizeKeyPart(path)}`;

  // Fallback: stable-ish composite.
  const title = pickFirst(record, [pickKeyName(keys, ['title', 'name']), 'title', 'name'].filter(Boolean));
  return `fallback:${normalizeKeyPart(platform)}:${normalizeKeyPart(title)}:${normalizeKeyPart(id)}`;
}

function summarizeRecord(record, metricsInfo, now, dueSoonHours) {
  const keys = Object.keys(record);
  const displayId =
    pickFirst(record, [
      pickKeyName(keys, ['short_id', 'video_id', 'distribution_id', 'id', 'demo_id']),
      'short_id',
      'video_id',
      'distribution_id',
      'id',
      'demo_id',
    ].filter(Boolean)) || '';

  const title =
    pickFirst(record, [pickKeyName(keys, ['title', 'name']), 'title', 'name'].filter(Boolean)) || '';

  const platform =
    pickFirst(record, [pickKeyName(keys, ['platform', 'channel', 'network']), 'platform', 'channel', 'network'].filter(Boolean)) ||
    '';

  const postUrl =
    pickFirst(record, [pickKeyName(keys, ['post_url', 'url', 'permalink', 'link']), 'post_url', 'url', 'permalink', 'link'].filter(Boolean)) ||
    '';

  const status = distributionStatusFromRecord(record);

  const metricsStatus =
    metricsInfo?.status ??
    metricsStatusFromRecord(record, now, dueSoonHours) ??
    null;

  const metricsDueAt = metricsInfo?.dueAt ?? null;

  return {
    key: deriveJoinKey(record),
    displayId,
    title,
    platform,
    postUrl,
    status,
    metricsStatus,
    metricsDueAt: metricsDueAt ? metricsDueAt.toISOString() : null,
    record,
    metricsRecord: metricsInfo?.record ?? null,
  };
}

async function safeStat(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

async function safeReadText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

async function loadData(batchDirAbs) {
  const now = new Date();
  const dueSoonHours = 48;

  const files = {
    publishReadyIndex: join(batchDirAbs, 'publish-ready-index.md'),
    publishLedger: join(batchDirAbs, 'publish-ledger.csv'),
    metricsLedger: join(batchDirAbs, 'metrics-snapshot-ledger.csv'),
    distributionReport: join(batchDirAbs, 'distribution-report.md'),
  };

  const fileInfo = {};
  for (const [k, p] of Object.entries(files)) {
    const s = await safeStat(p);
    fileInfo[k] = s
      ? { exists: true, path: p, sizeBytes: s.size, mtimeMs: s.mtimeMs }
      : { exists: false, path: p, sizeBytes: 0, mtimeMs: 0 };
  }

  const publishLedgerText = await safeReadText(files.publishLedger);
  const metricsLedgerText = await safeReadText(files.metricsLedger);

  const publishLedger = publishLedgerText ? parseCsv(publishLedgerText) : { headers: [], records: [] };
  const metricsLedger = metricsLedgerText ? parseCsv(metricsLedgerText) : { headers: [], records: [] };

  // Build a lookup for metrics rows using the same join-key heuristic.
  const metricsByKey = new Map();
  for (const rec of metricsLedger.records) {
    const key = deriveJoinKey(rec);
    const status = metricsStatusFromRecord(rec, now, dueSoonHours);
    const dueAtKey =
      pickKeyName(Object.keys(rec), [
        'metrics_due_at',
        'metrics_due',
        'next_metrics_at',
        'next_snapshot_at',
        'next_snapshot_due_at',
        'next_due_at',
        'due_at',
        'due',
        'metrics_due_date',
        'next_due_date',
        'due_date',
        'next_snapshot_date',
      ]) ?? null;
    const dueAt = dueAtKey ? parseDate(rec[dueAtKey]) : null;
    metricsByKey.set(key, { status: status ?? null, dueAt, record: rec });
  }

  const rows = publishLedger.records.map((rec) =>
    summarizeRecord(rec, metricsByKey.get(deriveJoinKey(rec)) ?? null, now, dueSoonHours)
  );

  // Surface metrics-only rows too (useful when the publish ledger is missing a line).
  for (const [key, mi] of metricsByKey.entries()) {
    if (rows.some((r) => r.key === key)) continue;
    const placeholder = summarizeRecord({}, mi, now, dueSoonHours);
    placeholder.key = key;
    placeholder.status = '';
    rows.push(placeholder);
  }

  // Consistent ordering: actionable first.
  const statusRank = (s) => {
    if (s === 'ready_for_manual_upload') return 0;
    if (s === 'published') return 1;
    if (String(s ?? '').trim() === '') return 3;
    return 2;
  };
  const metricsRank = (s) => {
    if (s === 'overdue') return 0;
    if (s === 'due_soon') return 1;
    return 2;
  };
  rows.sort((a, b) => {
    const sr = statusRank(a.status) - statusRank(b.status);
    if (sr !== 0) return sr;
    const mr = metricsRank(a.metricsStatus) - metricsRank(b.metricsStatus);
    if (mr !== 0) return mr;
    return String(a.displayId || a.title || a.key).localeCompare(String(b.displayId || b.title || b.key));
  });

  const counts = {
    total: rows.length,
    ready_for_manual_upload: rows.filter((r) => r.status === 'ready_for_manual_upload').length,
    published: rows.filter((r) => r.status === 'published').length,
    metrics_overdue: rows.filter((r) => r.metricsStatus === 'overdue').length,
    metrics_due_soon: rows.filter((r) => r.metricsStatus === 'due_soon').length,
  };

  return {
    now: now.toISOString(),
    dueSoonHours,
    batchDirAbs,
    fileInfo,
    publishLedger: { headers: publishLedger.headers, rowCount: publishLedger.records.length },
    metricsLedger: { headers: metricsLedger.headers, rowCount: metricsLedger.records.length },
    counts,
    rows,
  };
}

function renderIndexHtml() {
  // Keep this page self-contained (no external assets) to stay "local-only" friendly.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Publish Console</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #0b0d10;
        --panel: #12161c;
        --panel2: #0f1318;
        --text: #e7edf3;
        --muted: #9aa7b5;
        --border: rgba(255, 255, 255, 0.12);
        --accent: #7dd3fc;
        --good: #34d399;
        --warn: #fbbf24;
        --bad: #fb7185;
        --chip: rgba(255, 255, 255, 0.06);
        --shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
      }
      @media (prefers-color-scheme: light) {
        :root {
          --bg: #f6f7f9;
          --panel: #ffffff;
          --panel2: #fbfbfc;
          --text: #111827;
          --muted: #6b7280;
          --border: rgba(17, 24, 39, 0.12);
          --chip: rgba(17, 24, 39, 0.05);
          --shadow: 0 10px 24px rgba(17, 24, 39, 0.10);
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        background: var(--bg);
        color: var(--text);
      }
      a { color: var(--accent); text-decoration: none; }
      a:hover { text-decoration: underline; }
      header {
        position: sticky;
        top: 0;
        z-index: 20;
        backdrop-filter: blur(10px);
        background: color-mix(in srgb, var(--bg) 80%, transparent);
        border-bottom: 1px solid var(--border);
      }
      .wrap { max-width: 1320px; margin: 0 auto; padding: 14px 16px; }
      .title-row { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
      h1 { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: 0.2px; }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: color-mix(in srgb, var(--panel) 92%, transparent);
      }
      .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
      .row.space { justify-content: space-between; }
      .small { color: var(--muted); font-size: 12px; }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chip {
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--chip);
        padding: 4px 10px;
        font-size: 12px;
        color: var(--muted);
      }
      .chip strong { color: var(--text); font-weight: 650; }
      .quick-links {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 10px;
        margin-top: 12px;
      }
      .qcard {
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--panel);
        box-shadow: var(--shadow);
        padding: 10px 12px;
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
      }
      .badge {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid var(--border);
        color: var(--muted);
        background: color-mix(in srgb, var(--panel2) 92%, transparent);
        white-space: nowrap;
      }
      .badge.ok { color: var(--good); border-color: color-mix(in srgb, var(--good) 55%, var(--border)); }
      .badge.miss { color: var(--warn); border-color: color-mix(in srgb, var(--warn) 55%, var(--border)); }
      main .wrap { padding-top: 18px; }
      .controls {
        margin-top: 14px;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--panel);
        box-shadow: var(--shadow);
        padding: 12px;
      }
      .segmented {
        display: inline-flex;
        border: 1px solid var(--border);
        border-radius: 999px;
        overflow: hidden;
        background: var(--panel2);
      }
      .segmented button {
        appearance: none;
        border: 0;
        padding: 7px 10px;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        font-size: 12px;
      }
      .segmented button.active {
        background: var(--chip);
        color: var(--text);
        font-weight: 650;
      }
      .toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--panel2);
        color: var(--muted);
        font-size: 12px;
      }
      .toggle input { transform: translateY(0.5px); }
      .search {
        flex: 1;
        min-width: 220px;
        display: flex;
        gap: 8px;
        align-items: center;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--panel2);
        padding: 6px 10px;
      }
      .search input {
        flex: 1;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--text);
        font-size: 12px;
      }
      .btn {
        appearance: none;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--panel2);
        color: var(--text);
        padding: 7px 10px;
        cursor: pointer;
        font-size: 12px;
      }
      .btn:hover { background: var(--chip); }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 14px;
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
        background: var(--panel);
        box-shadow: var(--shadow);
      }
      thead th {
        text-align: left;
        font-size: 12px;
        color: var(--muted);
        background: var(--panel2);
        border-bottom: 1px solid var(--border);
        padding: 10px 10px;
        position: sticky;
        top: 148px;
        z-index: 10;
      }
      @media (max-width: 720px) {
        thead th { top: 220px; }
      }
      tbody td {
        border-top: 1px solid var(--border);
        padding: 10px 10px;
        vertical-align: top;
      }
      tbody tr:hover { background: color-mix(in srgb, var(--chip) 70%, transparent); }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      .tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 11px;
        color: var(--muted);
        background: color-mix(in srgb, var(--panel2) 88%, transparent);
        white-space: nowrap;
      }
      .tag.good { color: var(--good); border-color: color-mix(in srgb, var(--good) 55%, var(--border)); }
      .tag.warn { color: var(--warn); border-color: color-mix(in srgb, var(--warn) 55%, var(--border)); }
      .tag.bad { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 55%, var(--border)); }
      .dim { color: var(--muted); }
      .right { text-align: right; }
      .nowrap { white-space: nowrap; }
      .footer { padding: 14px 16px 28px; color: var(--muted); font-size: 12px; }
      .hide-sm { display: table-cell; }
      @media (max-width: 720px) {
        .hide-sm { display: none; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="wrap">
        <div class="title-row">
          <div class="row">
            <h1>Publish Console</h1>
            <span id="livePill" class="pill small">Loading…</span>
          </div>
          <div class="row">
            <button id="refreshBtn" class="btn" title="Reload ledgers">Refresh</button>
            <a class="btn" href="/api/data" target="_blank" rel="noreferrer">JSON</a>
          </div>
        </div>
        <div id="quickLinks" class="quick-links"></div>
        <div class="controls">
          <div class="row space">
            <div class="row" style="gap: 12px;">
              <div class="segmented" role="tablist" aria-label="Status filter">
                <button class="seg" data-status="all">All</button>
                <button class="seg" data-status="ready_for_manual_upload">Ready</button>
                <button class="seg" data-status="published">Published</button>
              </div>
              <label class="toggle" title="Only rows with metrics due soon or overdue">
                <input id="metricsOnly" type="checkbox" />
                Metrics due
              </label>
            </div>
            <div class="row" style="flex: 1; justify-content: flex-end;">
              <div class="search" title="Filter by id/title/platform/url">
                <span class="small">Search</span>
                <input id="searchInput" placeholder="e.g. tiktok, demo-12, youtube…" />
              </div>
            </div>
          </div>
          <div id="counts" class="chips" style="margin-top: 10px;"></div>
        </div>
      </div>
    </header>

    <main>
      <div class="wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 160px;">Status</th>
              <th>Item</th>
              <th class="hide-sm" style="width: 160px;">Platform</th>
              <th style="width: 180px;">Metrics</th>
              <th class="right hide-sm" style="width: 120px;">Raw</th>
            </tr>
          </thead>
          <tbody id="rows">
            <tr><td colspan="5" class="dim">Loading…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="footer wrap">
        Local-only console. Reads from <span class="mono">batch/</span>. No auth. No posting automation.
      </div>
    </main>

    <script type="module">
      const state = {
        status: "all",
        metricsOnly: false,
        search: "",
        data: null,
      };

      const $ = (id) => document.getElementById(id);
      const rowsEl = $("rows");
      const countsEl = $("counts");
      const quickLinksEl = $("quickLinks");
      const livePillEl = $("livePill");

      function tag(label, kind) {
        const cls =
          kind === "good" ? "tag good" :
          kind === "warn" ? "tag warn" :
          kind === "bad" ? "tag bad" : "tag";
        return \`<span class="\${cls}">\${label}</span>\`;
      }

      function badge(label, ok) {
        return \`<span class="badge \${ok ? "ok" : "miss"}">\${label}</span>\`;
      }

      function setSegmentActive() {
        document.querySelectorAll("button.seg").forEach((b) => {
          b.classList.toggle("active", b.dataset.status === state.status);
        });
      }

      function normalize(s) {
        return String(s ?? "").toLowerCase();
      }

      function matchesSearch(row, q) {
        if (!q) return true;
        const hay = [
          row.displayId,
          row.title,
          row.platform,
          row.postUrl,
          row.status,
          row.metricsStatus,
        ].map(normalize).join("  ");
        return hay.includes(q);
      }

      function filterRows(allRows) {
        const q = normalize(state.search).trim();
        return allRows.filter((r) => {
          if (state.status !== "all" && r.status !== state.status) return false;
          if (state.metricsOnly && !(r.metricsStatus === "overdue" || r.metricsStatus === "due_soon"))
            return false;
          if (!matchesSearch(r, q)) return false;
          return true;
        });
      }

      function renderCounts(data, filteredCount) {
        const c = data.counts;
        const parts = [
          \`<span class="chip"><strong>\${filteredCount}</strong> shown</span>\`,
          \`<span class="chip"><strong>\${c.total}</strong> total</span>\`,
          \`<span class="chip"><strong>\${c.ready_for_manual_upload}</strong> ready</span>\`,
          \`<span class="chip"><strong>\${c.published}</strong> published</span>\`,
          \`<span class="chip"><strong>\${c.metrics_overdue}</strong> metrics overdue</span>\`,
          \`<span class="chip"><strong>\${c.metrics_due_soon}</strong> metrics due soon</span>\`,
        ];
        countsEl.innerHTML = parts.join("");
      }

      function renderQuickLinks(data) {
        const links = [
          { key: "publishReadyIndex", label: "publish-ready-index.md", href: "/batch/publish-ready-index.md" },
          { key: "publishLedger", label: "publish-ledger.csv", href: "/batch/publish-ledger.csv" },
          { key: "metricsLedger", label: "metrics-snapshot-ledger.csv", href: "/batch/metrics-snapshot-ledger.csv" },
          { key: "distributionReport", label: "distribution-report.md", href: "/batch/distribution-report.md" },
        ];

        quickLinksEl.innerHTML = links
          .map((l) => {
            const info = data.fileInfo?.[l.key];
            const ok = Boolean(info?.exists);
            const meta = ok
              ? \`updated \${new Date(info.mtimeMs).toLocaleString()}\`
              : "missing";
            return \`
              <div class="qcard">
                <div>
                  <div><a href="\${l.href}" target="_blank" rel="noreferrer">\${l.label}</a></div>
                  <div class="small">\${meta}</div>
                </div>
                \${badge(ok ? "present" : "missing", ok)}
              </div>
            \`;
          })
          .join("");
      }

      function safeText(value) {
        const s = String(value ?? "").trim();
        return s;
      }

      function renderRows(data) {
        const filtered = filterRows(data.rows ?? []);
        renderCounts(data, filtered.length);

        if (filtered.length === 0) {
          rowsEl.innerHTML = \`<tr><td colspan="5" class="dim">No rows match the current filters.</td></tr>\`;
          return;
        }

        rowsEl.innerHTML = filtered
          .map((r) => {
            const status = safeText(r.status);
            const statusTag =
              status === "ready_for_manual_upload" ? tag("ready_for_manual_upload", "good") :
              status === "published" ? tag("published", "good") :
              status ? tag(status, "") : tag("(unknown)", "warn");

            const id = safeText(r.displayId);
            const title = safeText(r.title);
            const primary = id || title || r.key;
            const secondary = title && id ? title : "";

            const platform = safeText(r.platform) || "—";
            const url = safeText(r.postUrl);
            const urlHtml = url ? \`<div class="small"><a class="mono" href="\${url}" target="_blank" rel="noreferrer">open post</a></div>\` : "";

            const m = r.metricsStatus;
            const metricsTag =
              m === "overdue" ? tag("overdue", "bad") :
              m === "due_soon" ? tag("due_soon", "warn") :
              tag("ok/unknown", "");
            const dueAt = r.metricsDueAt ? new Date(r.metricsDueAt) : null;
            const dueMeta = dueAt ? \`<div class="small">due \${dueAt.toLocaleString()}</div>\` : \`<div class="small">—</div>\`;

            const raw = encodeURIComponent(JSON.stringify({ publish: r.record ?? null, metrics: r.metricsRecord ?? null }, null, 2));
            const rawHref = "data:application/json;charset=utf-8," + raw;

            return \`
              <tr>
                <td class="nowrap">\${statusTag}</td>
                <td>
                  <div><span class="mono">\${primary}</span>\${secondary ? \`<span class="dim"> — \${secondary}</span>\` : ""}</div>
                  \${urlHtml}
                </td>
                <td class="hide-sm">\${platform}</td>
                <td>
                  <div class="nowrap">\${metricsTag}</div>
                  \${dueMeta}
                </td>
                <td class="right hide-sm"><a href="\${rawHref}" target="_blank" rel="noreferrer">raw</a></td>
              </tr>
            \`;
          })
          .join("");
      }

      async function refresh() {
        rowsEl.innerHTML = \`<tr><td colspan="5" class="dim">Loading…</td></tr>\`;
        livePillEl.textContent = "Loading…";
        try {
          const res = await fetch("/api/data", { cache: "no-store" });
          if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
          state.data = await res.json();
          renderQuickLinks(state.data);
          renderRows(state.data);
          const now = new Date(state.data.now);
          livePillEl.textContent = \`Now: \${now.toLocaleString()} • due_soon: \${state.data.dueSoonHours}h\`;
        } catch (err) {
          const msg = err && err.message ? err.message : String(err);
          rowsEl.innerHTML = \`<tr><td colspan="5" class="dim">Failed to load data: \${msg}</td></tr>\`;
          livePillEl.textContent = "Load failed";
        }
      }

      document.querySelectorAll("button.seg").forEach((b) => {
        b.addEventListener("click", () => {
          state.status = b.dataset.status;
          setSegmentActive();
          if (state.data) renderRows(state.data);
        });
      });

      $("metricsOnly").addEventListener("change", (e) => {
        state.metricsOnly = Boolean(e.target.checked);
        if (state.data) renderRows(state.data);
      });

      $("searchInput").addEventListener("input", (e) => {
        state.search = e.target.value || "";
        if (state.data) renderRows(state.data);
      });

      $("refreshBtn").addEventListener("click", () => refresh());

      // Default state.
      state.status = "all";
      setSegmentActive();
      refresh();
    </script>
  </body>
</html>`;
}

async function serveBatchFile(req, res, batchDirAbs) {
  const url = new URL(req.url, 'http://localhost');
  const rel = url.pathname.replace(/^\/batch\/+/, '');
  const safeRel = rel.replaceAll('..', '').replaceAll('\\', '/');
  const abs = resolve(batchDirAbs, safeRel);
  if (!abs.startsWith(resolve(batchDirAbs))) {
    text(res, 400, 'Bad path');
    return;
  }
  if (!existsSync(abs)) {
    text(res, 404, `Missing: ${basename(abs)}`);
    return;
  }
  try {
    const buf = await readFile(abs);
    res.writeHead(200, { 'content-type': guessMime(abs), 'cache-control': 'no-store' });
    res.end(buf);
  } catch (err) {
    text(res, 500, err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const batchDirAbs = resolve(repoRoot, args.batchDir ?? 'batch');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    try {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        text(res, 200, renderIndexHtml(), 'text/html; charset=utf-8');
        return;
      }

      if (url.pathname === '/api/data') {
        const data = await loadData(batchDirAbs);
        json(res, 200, data);
        return;
      }

      if (url.pathname.startsWith('/batch/')) {
        await serveBatchFile(req, res, batchDirAbs);
        return;
      }

      text(res, 404, 'Not found');
    } catch (err) {
      text(res, 500, err instanceof Error ? (err.stack ?? err.message) : String(err));
    }
  });

  server.listen(args.port, args.host, () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : args.port;
    process.stdout.write(
      [
        '',
        'Publish console (local-only)',
        `- batch dir: ${batchDirAbs}`,
        `- url: http://${args.host}:${port}/`,
        '',
      ].join('\n')
    );
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exitCode = 2;
});

