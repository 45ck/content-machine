import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { z, ZodError, type ZodType } from 'zod';

export const HarnessActorSchema = z.enum(['claude-code', 'codex-cli', 'generic']);

export const HarnessRequestMetaSchema = z
  .object({
    actor: HarnessActorSchema.optional(),
    cwd: z.string().min(1).optional(),
    runId: z.string().min(1).optional(),
  })
  .strict();

export type HarnessRequestMeta = z.infer<typeof HarnessRequestMetaSchema>;

export const HarnessArtifactSchema = z
  .object({
    path: z.string().min(1),
    kind: z.enum(['file', 'directory']),
    description: z.string().min(1),
  })
  .strict();

export type HarnessArtifact = z.infer<typeof HarnessArtifactSchema>;

export interface HarnessSuccess<TResult> {
  ok: true;
  tool: string;
  result: TResult;
  artifacts: HarnessArtifact[];
  warnings: string[];
  meta: HarnessRequestMeta;
}

export interface HarnessFailure {
  ok: false;
  tool: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HarnessToolResult<TResult> {
  result: TResult;
  artifacts?: HarnessArtifact[];
  warnings?: string[];
}

export interface HarnessToolContext<TInput> {
  input: TInput;
  meta: HarnessRequestMeta;
}

/** Describe a file artifact returned from a harness tool. */
export function artifactFile(path: string, description: string): HarnessArtifact {
  return { path, kind: 'file', description };
}

/** Describe a directory artifact returned from a harness tool. */
export function artifactDirectory(path: string, description: string): HarnessArtifact {
  return { path, kind: 'directory', description };
}

async function readStdinUtf8(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString('utf8').trim();
}

function makeRequestSchema<TInput>(inputSchema: ZodType<TInput>) {
  return z.union([
    inputSchema,
    z
      .object({
        input: inputSchema,
        meta: HarnessRequestMetaSchema.optional(),
      })
      .strict(),
  ]);
}

/** Parse either direct JSON input or the wrapped `{input, meta}` harness shape. */
export function parseHarnessInput<TInput>(
  inputSchema: ZodType<TInput>,
  rawInput: string
): HarnessToolContext<TInput> {
  if (!rawInput.trim()) {
    throw new Error('Expected JSON on stdin');
  }

  const json = JSON.parse(rawInput) as unknown;
  const parsed = makeRequestSchema(inputSchema).parse(json);

  if (typeof parsed === 'object' && parsed !== null && 'input' in parsed && 'meta' in parsed) {
    const wrapped = parsed as { input: TInput; meta?: HarnessRequestMeta };
    return { input: wrapped.input, meta: wrapped.meta ?? {} };
  }

  return { input: parsed as TInput, meta: {} };
}

/** Convert an exception into the standard harness failure envelope. */
export function createHarnessFailure(tool: string, error: unknown): HarnessFailure {
  if (error instanceof ZodError) {
    return {
      ok: false,
      tool,
      error: {
        code: 'INVALID_INPUT',
        message: 'Input did not match the expected schema',
        details: error.flatten(),
      },
    };
  }

  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: string; details?: unknown };
    return {
      ok: false,
      tool,
      error: {
        code: errorWithCode.code ?? 'HARNESS_ERROR',
        message: error.message,
        ...(errorWithCode.details !== undefined ? { details: errorWithCode.details } : {}),
      },
    };
  }

  return {
    ok: false,
    tool,
    error: {
      code: 'HARNESS_ERROR',
      message: String(error),
    },
  };
}

/** Execute a harness tool handler and wrap its result in the standard envelope. */
export async function executeHarnessTool<TInput, TResult>(params: {
  tool: string;
  inputSchema: ZodType<TInput>;
  handler: (context: HarnessToolContext<TInput>) => Promise<HarnessToolResult<TResult>>;
  rawInput?: string;
}): Promise<HarnessSuccess<TResult> | HarnessFailure> {
  try {
    const rawInput = params.rawInput ?? (await readStdinUtf8());
    const context = parseHarnessInput(params.inputSchema, rawInput);
    const handled = await params.handler(context);

    return {
      ok: true,
      tool: params.tool,
      result: handled.result,
      artifacts: handled.artifacts ?? [],
      warnings: handled.warnings ?? [],
      meta: context.meta,
    };
  } catch (error) {
    return createHarnessFailure(params.tool, error);
  }
}

/** Read stdin, run the harness tool, and print the JSON envelope to stdout. */
export async function runHarnessTool<TInput, TResult>(params: {
  tool: string;
  inputSchema: ZodType<TInput>;
  handler: (context: HarnessToolContext<TInput>) => Promise<HarnessToolResult<TResult>>;
}): Promise<void> {
  const result = await executeHarnessTool(params);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

/** Detect whether the current module is being run as the process entrypoint. */
export function isDirectExecution(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(metaUrl) === entry;
}
