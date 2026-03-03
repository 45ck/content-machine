/**
 * MCP Server - Content Machine
 *
 * Creates and starts an MCP server that exposes Content Machine capabilities as tools.
 */
import type { FastMCP } from 'fastmcp';
import { loadFastMcp } from './fastmcp';
import { registerContentMachineMcpTools } from './tools';
import { McpSessionStore, type McpSessionStoreOptions } from './session-store';

type McpVersion = `${number}.${number}.${number}`;

function normalizeVersion(version: string | undefined): McpVersion {
  if (version && /^\d+\.\d+\.\d+$/.test(version)) return version as McpVersion;
  return '0.0.0';
}

function normalizeEndpoint(endpoint: string | undefined): `/${string}` | undefined {
  if (!endpoint) return undefined;
  if (endpoint.startsWith('/')) return endpoint as `/${string}`;
  return `/${endpoint}` as `/${string}`;
}

export interface CreateContentMachineMcpServerOptions extends McpSessionStoreOptions {
  name?: string;
  version?: string;
}

export async function createContentMachineMcpServer(
  options: CreateContentMachineMcpServerOptions = {}
): Promise<{
  server: FastMCP;
  sessionStore: McpSessionStore;
}> {
  const { FastMCP } = await loadFastMcp();

  const server = new FastMCP({
    name: options.name ?? 'content-machine',
    version: normalizeVersion(options.version),
  });

  const sessionStore = new McpSessionStore({
    artifactsRootDir: options.artifactsRootDir,
    stateless: options.stateless,
    missingSessionIdStrategy: options.missingSessionIdStrategy,
    sessionTtlMs: options.sessionTtlMs,
    maxSessions: options.maxSessions,
    cleanupArtifactsOnEvict: options.cleanupArtifactsOnEvict,
    sweepIntervalMs: options.sweepIntervalMs,
  });
  registerContentMachineMcpTools({ server, sessionStore });

  return { server, sessionStore };
}

export type ContentMachineMcpTransport = 'stdio' | 'httpStream';

export interface StartContentMachineMcpServerOptions extends CreateContentMachineMcpServerOptions {
  transportType: ContentMachineMcpTransport;
  host?: string;
  port?: number;
  endpoint?: string;
  stateless?: boolean;
}

export async function startContentMachineMcpServer(
  options: StartContentMachineMcpServerOptions
): Promise<void> {
  const missingSessionIdStrategy =
    options.missingSessionIdStrategy ??
    (options.transportType === 'httpStream' ? 'ephemeral' : 'shared');

  const { server } = await createContentMachineMcpServer({
    ...options,
    missingSessionIdStrategy,
  });

  if (options.transportType === 'httpStream') {
    return server.start({
      transportType: 'httpStream',
      httpStream: {
        host: options.host,
        port: options.port ?? 8080,
        endpoint: normalizeEndpoint(options.endpoint),
        stateless: options.stateless,
      },
    });
  }

  return server.start({ transportType: 'stdio' });
}
