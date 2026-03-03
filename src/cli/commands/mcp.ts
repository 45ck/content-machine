/**
 * MCP command - Start an MCP server exposing Content Machine tools
 *
 * Usage:
 *   cm mcp --transport stdio
 *   cm mcp --transport httpStream --port 8080
 */
import { Command } from 'commander';
import { startContentMachineMcpServer, type ContentMachineMcpTransport } from '../../server/mcp';
import { CMError } from '../../core/errors';
import { version } from '../meta';
import { handleCommandError } from '../utils';

function isLoopbackHost(host: string): boolean {
  const normalized = host
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  if (normalized === 'localhost') return true;
  if (normalized === '::1') return true;
  if (normalized === '127.0.0.1') return true;
  if (normalized.startsWith('127.')) return true;
  return false;
}

function normalizeTransport(value: string): ContentMachineMcpTransport {
  if (value === 'stdio') return 'stdio';
  if (value === 'httpStream' || value === 'http') return 'httpStream';
  throw new CMError('INVALID_ARGUMENT', `Unknown transport: ${value}`, {
    allowed: ['stdio', 'httpStream'],
    fix: 'Use --transport stdio or --transport httpStream',
  });
}

export const mcpCommand = new Command('mcp')
  .description('Start an MCP server exposing Content Machine pipeline tools')
  .option('--transport <type>', 'Transport: stdio | httpStream', 'stdio')
  .option('--host <host>', 'HTTP host (httpStream transport)', '127.0.0.1')
  .option('--port <number>', 'HTTP port (httpStream transport)', '8080')
  .option('--endpoint <path>', 'HTTP endpoint path (httpStream transport, default: /mcp)')
  .option('--stateless', 'Stateless mode (httpStream only)', false)
  .option('--unsafe-allow-network', 'Allow binding httpStream to non-loopback hosts', false)
  .option(
    '--artifacts-dir <path>',
    'Artifacts root directory (default: output/mcp or $CM_MCP_ARTIFACTS_DIR)'
  )
  .option('--session-ttl-ms <ms>', 'Evict inactive sessions after ms (0 disables)')
  .option('--max-sessions <n>', 'Max sessions to keep in memory (LRU eviction)')
  .option('--cleanup-artifacts-on-evict', 'Delete session artifacts directory when evicting', false)
  .option('--sweep-interval-ms <ms>', 'Minimum interval between eviction sweeps (0 = every access)')
  .action(async (options: Record<string, unknown>, command: Command) => {
    try {
      const transportType = normalizeTransport(String(options.transport));
      const host = typeof options.host === 'string' ? options.host : '127.0.0.1';
      const port = Number.parseInt(String(options.port), 10);
      const endpoint = typeof options.endpoint === 'string' ? options.endpoint : undefined;
      const stateless = Boolean(options.stateless);
      const unsafeAllowNetwork = Boolean(options.unsafeAllowNetwork);
      const artifactsRootDir =
        typeof options.artifactsDir === 'string' ? options.artifactsDir : undefined;
      const sessionTtlMs =
        typeof options.sessionTtlMs === 'string'
          ? Number.parseInt(options.sessionTtlMs, 10)
          : undefined;
      const maxSessions =
        typeof options.maxSessions === 'string'
          ? Number.parseInt(options.maxSessions, 10)
          : undefined;
      const sweepIntervalMs =
        typeof options.sweepIntervalMs === 'string'
          ? Number.parseInt(options.sweepIntervalMs, 10)
          : undefined;
      const cleanupArtifactsOnEvict =
        command.getOptionValueSource('cleanupArtifactsOnEvict') === 'default'
          ? undefined
          : Boolean(options.cleanupArtifactsOnEvict);

      if (transportType === 'httpStream' && (!Number.isFinite(port) || port <= 0)) {
        throw new CMError('INVALID_ARGUMENT', `Invalid port: ${String(options.port)}`, {
          fix: 'Use --port 8080 (or any valid port number)',
        });
      }

      if (transportType === 'httpStream' && !isLoopbackHost(host) && !unsafeAllowNetwork) {
        throw new CMError(
          'INVALID_ARGUMENT',
          `Refusing to bind MCP server to non-loopback host: ${host}`,
          {
            fix: 'Use --host 127.0.0.1 (recommended) or pass --unsafe-allow-network to override.',
          }
        );
      }

      const startPromise = startContentMachineMcpServer({
        name: 'content-machine',
        version,
        artifactsRootDir,
        transportType,
        host: transportType === 'httpStream' ? host : undefined,
        port,
        endpoint,
        stateless,
        sessionTtlMs: Number.isFinite(sessionTtlMs ?? NaN) ? sessionTtlMs : undefined,
        maxSessions: Number.isFinite(maxSessions ?? NaN) ? maxSessions : undefined,
        cleanupArtifactsOnEvict,
        sweepIntervalMs: Number.isFinite(sweepIntervalMs ?? NaN) ? sweepIntervalMs : undefined,
      });

      if (transportType === 'httpStream') {
        const resolvedEndpoint = endpoint ?? '/mcp';
        process.stderr.write(
          `MCP server listening on http://${host}:${port}${resolvedEndpoint} (SSE: http://${host}:${port}/sse)\n`
        );
      } else {
        process.stderr.write('MCP server running on stdio\n');
      }

      await startPromise;
    } catch (error) {
      handleCommandError(error);
    }
  });
