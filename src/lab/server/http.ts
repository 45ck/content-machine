import type { IncomingMessage, ServerResponse } from 'node:http';
import { CMError, isCMError, wrapError } from '../../core/errors';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    context?: Record<string, unknown>;
  };
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(payload);
}

export function sendError(res: ServerResponse, status: number, error: CMError): void {
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      context: error.context as Record<string, unknown> | undefined,
    },
  };
  sendJson(res, status, body);
}

function statusForCode(code: string): number {
  if (code === 'INVALID_ARGUMENT' || code === 'INVALID_CURSOR' || code === 'INVALID_JSON')
    return 400;
  if (code === 'UNAUTHORIZED') return 401;
  if (code === 'FORBIDDEN') return 403;
  if (code === 'NOT_FOUND' || code === 'FILE_NOT_FOUND') return 404;
  return 500;
}

export function handleRouteError(res: ServerResponse, error: unknown): void {
  const cm = isCMError(error) ? error : wrapError(error, 'INTERNAL');
  const status = statusForCode(cm.code);
  sendError(res, status, cm);
}

export async function readJsonBody<T = unknown>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new CMError('INVALID_JSON', 'Invalid JSON body', {
      fix: 'Send a valid JSON body and set Content-Type: application/json',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export function requireToken(req: IncomingMessage, expected: string): void {
  const header = req.headers['x-cm-lab-token'];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token || token !== expected) {
    throw new CMError('UNAUTHORIZED', 'Missing or invalid X-CM-LAB-TOKEN', {
      fix: 'Fetch /api/config and include the X-CM-LAB-TOKEN header for all POST requests.',
    });
  }
}

export function getRequestId(req: IncomingMessage, bodyRequestId?: unknown): string | null {
  const header = req.headers['x-cm-lab-request-id'];
  const requestId = Array.isArray(header) ? header[0] : header;
  if (requestId && String(requestId).trim()) return String(requestId).trim();
  if (typeof bodyRequestId === 'string' && bodyRequestId.trim()) return bodyRequestId.trim();
  return null;
}
