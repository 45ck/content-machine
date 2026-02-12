import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname } from 'node:path';

function inferMimeType(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Convert a local image file into a data URL payload.
 */
export async function fileToDataUrl(path: string): Promise<string> {
  const bytes = await readFile(path);
  const base64 = bytes.toString('base64');
  return `data:${inferMimeType(path)};base64,${base64}`;
}

/**
 * Execute an HTTP request and parse JSON/text response with timeout handling.
 */
export async function fetchJsonWithTimeout(params: {
  url: string;
  init?: RequestInit;
  timeoutMs?: number;
}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 60_000);
  try {
    const response = await fetch(params.url, {
      ...params.init,
      signal: controller.signal,
    });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      json = text;
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText} for ${params.url}: ${typeof json === 'string' ? json : JSON.stringify(json)}`
      );
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Download remote bytes to a local file path.
 */
export async function downloadToPath(params: {
  url: string;
  outputPath: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 120_000);
  try {
    const response = await fetch(params.url, {
      headers: params.headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    await mkdir(dirname(params.outputPath), { recursive: true });
    await writeFile(params.outputPath, bytes);
    return params.outputPath;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Persist base64-encoded binary data to disk.
 */
export async function writeBase64ToPath(params: {
  base64: string;
  outputPath: string;
}): Promise<string> {
  const normalized = params.base64.replace(/^data:[^;]+;base64,/, '');
  const bytes = Buffer.from(normalized, 'base64');
  await mkdir(dirname(params.outputPath), { recursive: true });
  await writeFile(params.outputPath, bytes);
  return params.outputPath;
}

/**
 * Pause execution for a fixed number of milliseconds.
 */
export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
