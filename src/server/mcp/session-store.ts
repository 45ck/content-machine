/**
 * MCP Session Store
 *
 * Tracks per-session in-memory state and provides a per-session artifacts directory.
 * Keeps MCP state management isolated from pipeline modules.
 */
import { createHash } from 'crypto';
import { mkdir, rm } from 'fs/promises';
import { join, resolve } from 'path';
import type {
  AudioOutput,
  RenderOutput,
  ResearchOutput,
  ScriptOutput,
  TimestampsOutput,
  VisualsOutput,
} from '../../domain';

export interface McpSessionState {
  id: string;
  artifactsDir: string;
  lastResearch?: ResearchOutput;
  lastScript?: ScriptOutput;
  lastAudio?: AudioOutput;
  lastTimestamps?: TimestampsOutput;
  lastVisuals?: VisualsOutput;
  lastRender?: RenderOutput;
}

export interface McpToolContextLike {
  sessionId?: string;
  requestId?: string;
}

export interface McpSessionStoreOptions {
  artifactsRootDir?: string;
  /**
   * Stateless mode: do not persist in-memory session state between requests.
   *
   * Matches FastMCP's `httpStream.stateless` behavior.
   */
  stateless?: boolean;
  /**
   * What to do when `context.sessionId` is missing (e.g. http clients that don't
   * send `Mcp-Session-Id`).
   *
   * - `shared`: use a stable "default" session (good for stdio where one process = one client)
   * - `ephemeral`: isolate each request (safe default for http servers)
   */
  missingSessionIdStrategy?: 'shared' | 'ephemeral';
  /** Evict sessions after this many ms of inactivity. Set to 0 to disable. */
  sessionTtlMs?: number;
  /** Maximum sessions kept in memory (LRU eviction). */
  maxSessions?: number;
  /** Delete `artifactsDir` when evicting a session. */
  cleanupArtifactsOnEvict?: boolean;
  /** Minimum interval between sweep passes. Set to 0 to sweep every access. */
  sweepIntervalMs?: number;
}

function hashId(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function sanitizeId(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!cleaned) return hashId(value);
  if (cleaned.length <= 64) return cleaned;
  return `${cleaned.slice(0, 48)}_${hashId(value)}`;
}

function parseInteger(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y')
    return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'n')
    return false;
  return undefined;
}

interface StoredSession {
  state: McpSessionState;
  createdAtMs: number;
  lastAccessAtMs: number;
}

export class McpSessionStore {
  readonly artifactsRootDir: string;
  readonly stateless: boolean;
  readonly missingSessionIdStrategy: 'shared' | 'ephemeral';
  readonly sessionTtlMs: number;
  readonly maxSessions: number;
  readonly cleanupArtifactsOnEvict: boolean;
  readonly sweepIntervalMs: number;

  private sessions = new Map<string, StoredSession>();
  private lastSweepAtMs = 0;

  constructor(options: McpSessionStoreOptions = {}) {
    const root =
      options.artifactsRootDir ??
      process.env.CM_MCP_ARTIFACTS_DIR ??
      join(process.cwd(), 'output', 'mcp');

    this.artifactsRootDir = resolve(root);
    this.stateless = options.stateless ?? false;
    this.missingSessionIdStrategy = options.missingSessionIdStrategy ?? 'shared';

    const envTtlMs = parseInteger(process.env.CM_MCP_SESSION_TTL_MS);
    const envMaxSessions = parseInteger(process.env.CM_MCP_MAX_SESSIONS);
    const envCleanup = parseBoolean(process.env.CM_MCP_CLEANUP_ARTIFACTS_ON_EVICT);
    const envSweepIntervalMs = parseInteger(process.env.CM_MCP_SWEEP_INTERVAL_MS);

    const ttlMs = options.sessionTtlMs ?? envTtlMs;
    const maxSessions = options.maxSessions ?? envMaxSessions;
    const cleanup = options.cleanupArtifactsOnEvict ?? envCleanup;
    const sweepIntervalMs = options.sweepIntervalMs ?? envSweepIntervalMs;

    // Defaults: safe for local servers, avoid unbounded growth.
    this.sessionTtlMs = ttlMs === undefined ? 24 * 60 * 60 * 1000 : Math.max(0, ttlMs);
    this.maxSessions = maxSessions === undefined ? 50 : Math.max(1, maxSessions);
    this.cleanupArtifactsOnEvict = cleanup ?? false;
    this.sweepIntervalMs = sweepIntervalMs === undefined ? 60_000 : Math.max(0, sweepIntervalMs);
  }

  private getEphemeralSessionId(context: McpToolContextLike): string {
    const basis =
      (typeof context.requestId === 'string' && context.requestId.trim().length > 0
        ? context.requestId.trim()
        : undefined) ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const prefix =
      typeof context.sessionId === 'string' && context.sessionId.trim().length > 0
        ? sanitizeId(context.sessionId.trim())
        : 'anon';

    return sanitizeId(`${prefix}_${basis}`);
  }

  private getSessionId(context: McpToolContextLike): string {
    if (this.stateless) return this.getEphemeralSessionId(context);

    if (typeof context.sessionId === 'string' && context.sessionId.trim().length > 0) {
      return sanitizeId(context.sessionId.trim());
    }

    if (this.missingSessionIdStrategy === 'shared') return 'default';
    return this.getEphemeralSessionId(context);
  }

  async get(context: McpToolContextLike): Promise<McpSessionState> {
    const nowMs = Date.now();
    const sessionId = this.getSessionId(context);

    if (!this.stateless) {
      await this.maybeSweep(nowMs);

      const existing = this.sessions.get(sessionId);
      if (existing) {
        existing.lastAccessAtMs = nowMs;
        return existing.state;
      }
    }

    const artifactsDir = join(this.artifactsRootDir, sessionId);
    await mkdir(artifactsDir, { recursive: true });

    const created: McpSessionState = { id: sessionId, artifactsDir };
    if (!this.stateless) {
      this.sessions.set(sessionId, { state: created, createdAtMs: nowMs, lastAccessAtMs: nowMs });

      if (this.sessions.size > this.maxSessions) {
        await this.sweep(nowMs);
      }
    }

    return created;
  }

  async reset(context: McpToolContextLike): Promise<McpSessionState> {
    const sessionId = this.getSessionId(context);
    if (this.stateless) return this.get(context);
    this.sessions.delete(sessionId);
    return this.get({ sessionId });
  }

  private async maybeSweep(nowMs: number): Promise<void> {
    if (this.sweepIntervalMs > 0 && nowMs - this.lastSweepAtMs < this.sweepIntervalMs) return;
    this.lastSweepAtMs = nowMs;
    await this.sweep(nowMs);
  }

  private async sweep(nowMs: number): Promise<void> {
    const toEvict: string[] = [];

    if (this.sessionTtlMs > 0) {
      for (const [id, session] of this.sessions) {
        if (nowMs - session.lastAccessAtMs > this.sessionTtlMs) toEvict.push(id);
      }
    }

    for (const id of toEvict) {
      await this.evict(id);
    }

    if (this.sessions.size <= this.maxSessions) return;

    const lru = Array.from(this.sessions.entries()).sort(
      (a, b) => a[1].lastAccessAtMs - b[1].lastAccessAtMs
    );
    const over = this.sessions.size - this.maxSessions;
    for (let i = 0; i < over; i++) {
      const id = lru[i]?.[0];
      if (id) await this.evict(id);
    }
  }

  private async evict(sessionId: string): Promise<void> {
    const stored = this.sessions.get(sessionId);
    if (!stored) return;
    this.sessions.delete(sessionId);

    if (!this.cleanupArtifactsOnEvict) return;
    try {
      await rm(stored.state.artifactsDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup; ignore.
    }
  }
}
