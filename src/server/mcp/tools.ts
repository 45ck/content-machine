/**
 * MCP Tools - Content Machine
 *
 * Tool definitions are thin wrappers around existing pipeline functions.
 */
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'path';
import { z } from 'zod';
import { ArchetypeEnum, OrientationEnum } from '../../core/config';
import { CAPTION_STYLE_PRESETS, type CaptionPresetName } from '../../render/captions/presets';
import {
  AudioOutputSchema,
  RenderOutputSchema,
  ResearchOutputSchema,
  ResearchSourceEnum,
  ScriptOutputSchema,
  TimestampsOutputSchema,
  VisualsOutputSchema,
} from '../../domain';
import type {
  AudioOutput,
  RenderOutput,
  ResearchOutput,
  ResearchSource,
  ScriptOutput,
  TimestampsOutput,
  VisualsOutput,
} from '../../domain';
import type { ProviderName } from '../../visuals/providers';
import { DEFAULT_ARTIFACT_FILENAMES } from '../../domain/repo-facts.generated';
import type { McpSessionStore } from './session-store';
import type { McpToolContextLike, McpSessionState } from './session-store';
import { loadFastMcp } from './fastmcp';

const CaptionPresetNameSchema = z.enum(
  Object.keys(CAPTION_STYLE_PRESETS) as [CaptionPresetName, ...CaptionPresetName[]]
);

export interface McpToolContext extends McpToolContextLike {
  log: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
  reportProgress?: (event: { progress: number; total?: number }) => Promise<void> | void;
}

async function requireSessionValue<T>(
  session: McpSessionState,
  value: T | undefined,
  label: string
): Promise<T> {
  if (value !== undefined) return value;
  const sessionHint = session.id ? ` (session: ${session.id})` : '';
  const { UserError } = await loadFastMcp();
  throw new UserError(
    `Missing ${label}${sessionHint}. Provide it explicitly or run the previous stage in the same session.`
  );
}

async function resolveSessionPath(
  session: McpSessionState,
  path: string,
  label: string
): Promise<string> {
  const root = resolve(session.artifactsDir);
  const candidate = resolve(isAbsolute(path) ? path : join(root, path));
  if (candidate === root || candidate.startsWith(root + sep)) return candidate;

  const { UserError } = await loadFastMcp();
  throw new UserError(
    `${label} must be within the session artifacts directory: ${root} (got: ${path})`
  );
}

async function readJsonFile<S extends z.ZodTypeAny>(path: string, schema: S): Promise<z.output<S>> {
  const raw = await readFile(path, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  return schema.parse(parsed);
}

async function maybeWriteJsonFile(path: string | undefined, data: unknown): Promise<void> {
  if (!path) return;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Build the Content Machine MCP tool registry for a session-aware server.
 */
// eslint-disable-next-line max-lines-per-function
export function createContentMachineMcpTools(params: {
  sessionStore: McpSessionStore;
}): Record<string, { name: string; description: string; parameters: z.ZodTypeAny; execute: any }> {
  const { sessionStore } = params;

  const tools = {
    reset_session: {
      name: 'reset_session',
      description: 'Clear in-memory session state for this client.',
      parameters: z.object({}),
      execute: async (_args: unknown, context: McpToolContext): Promise<{ ok: true }> => {
        await sessionStore.reset(context);
        context.log.info('Session reset');
        return { ok: true };
      },
    },

    get_session: {
      name: 'get_session',
      description: 'Inspect what artifacts are currently stored in this session.',
      parameters: z.object({}),
      execute: async (_args: unknown, context: McpToolContext) => {
        const session = await sessionStore.get(context);
        return {
          sessionId: session.id,
          artifactsDir: session.artifactsDir,
          has: {
            research: Boolean(session.lastResearch),
            script: Boolean(session.lastScript),
            audio: Boolean(session.lastAudio),
            timestamps: Boolean(session.lastTimestamps),
            visuals: Boolean(session.lastVisuals),
            render: Boolean(session.lastRender),
          },
        };
      },
    },

    research: {
      name: 'research',
      description: 'Research a topic across sources and return structured evidence.',
      parameters: z.object({
        query: z.string().min(1),
        sources: z.array(ResearchSourceEnum).optional(),
        limitPerSource: z.number().int().positive().optional(),
        timeRange: z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).optional(),
        generateAngles: z.boolean().optional(),
        maxAngles: z.number().int().positive().optional(),
        timeoutMs: z.number().int().positive().optional(),
        parallel: z.boolean().optional(),
        saveToSession: z.boolean().optional().default(true),
        outputPath: z.string().optional(),
      }),
      execute: async (
        args: {
          query: string;
          sources?: ResearchSource[];
          limitPerSource?: number;
          timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
          generateAngles?: boolean;
          maxAngles?: number;
          timeoutMs?: number;
          parallel?: boolean;
          saveToSession?: boolean;
          outputPath?: string;
        },
        context: McpToolContext
      ): Promise<ResearchOutput> => {
        const session = await sessionStore.get(context);

        const { createLLMProvider } = await import('../../core/llm');
        const { loadConfig } = await import('../../core/config');
        const { createResearchOrchestrator } = await import('../../research/orchestrator');

        const cfg = await loadConfig();
        const wantsAngles = args.generateAngles !== false;
        const llmProvider = wantsAngles
          ? createLLMProvider(cfg.llm.provider, cfg.llm.model)
          : undefined;

        if (args.sources && args.sources.length === 0) {
          const { UserError } = await loadFastMcp();
          throw new UserError('sources must be a non-empty array when provided');
        }

        const orchestratorConfig: Record<string, unknown> = { generateAngles: wantsAngles };
        if (args.sources && args.sources.length > 0) orchestratorConfig.sources = args.sources;
        if (args.limitPerSource !== undefined)
          orchestratorConfig.limitPerSource = args.limitPerSource;
        if (args.timeRange !== undefined) orchestratorConfig.timeRange = args.timeRange;
        if (args.maxAngles !== undefined) orchestratorConfig.maxAngles = args.maxAngles;
        if (args.timeoutMs !== undefined) orchestratorConfig.timeoutMs = args.timeoutMs;
        if (args.parallel !== undefined) orchestratorConfig.parallel = args.parallel;

        const orchestrator = createResearchOrchestrator(orchestratorConfig, llmProvider);

        context.log.info('Researching', { query: args.query });

        const result = await orchestrator.research(args.query);
        const output = ResearchOutputSchema.parse(result.output);

        if (args.saveToSession !== false) session.lastResearch = output;
        await maybeWriteJsonFile(
          args.outputPath
            ? await resolveSessionPath(session, args.outputPath, 'outputPath')
            : undefined,
          output
        );

        return output;
      },
    },

    generate_script: {
      name: 'generate_script',
      description: 'Generate a short-form video script for a topic.',
      parameters: z.object({
        topic: z.string().min(1),
        archetype: ArchetypeEnum.default('listicle'),
        targetDuration: z.number().positive().optional(),
        packaging: z
          .object({
            title: z.string().min(1),
            coverText: z.string().min(1),
            onScreenHook: z.string().min(1),
          })
          .optional(),
        research: ResearchOutputSchema.optional(),
        useSessionResearch: z.boolean().optional().default(true),
        saveToSession: z.boolean().optional().default(true),
        outputPath: z.string().optional(),
      }),
      execute: async (
        args: {
          topic: string;
          archetype: z.infer<typeof ArchetypeEnum>;
          targetDuration?: number;
          packaging?: { title: string; coverText: string; onScreenHook: string };
          research?: ResearchOutput;
          useSessionResearch?: boolean;
          saveToSession?: boolean;
          outputPath?: string;
        },
        context: McpToolContext
      ): Promise<ScriptOutput> => {
        const session = await sessionStore.get(context);
        const { generateScript } = await import('../../script/generator');

        const research =
          args.research ?? (args.useSessionResearch !== false ? session.lastResearch : undefined);

        const script = await generateScript({
          topic: args.topic,
          archetype: args.archetype,
          targetDuration: args.targetDuration,
          packaging: args.packaging,
          research,
        });

        const output = ScriptOutputSchema.parse(script);
        if (args.saveToSession !== false) session.lastScript = output;
        await maybeWriteJsonFile(
          args.outputPath
            ? await resolveSessionPath(session, args.outputPath, 'outputPath')
            : undefined,
          output
        );

        return output;
      },
    },

    generate_audio: {
      name: 'generate_audio',
      description: 'Generate voiceover audio and word-level timestamps from a script.',
      parameters: z.object({
        script: ScriptOutputSchema.optional(),
        scriptPath: z.string().optional(),
        useSessionScript: z.boolean().optional().default(true),
        voice: z.string().min(1).default('af_heart'),
        speed: z.number().positive().optional(),
        outputPath: z.string().optional(),
        timestampsPath: z.string().optional(),
        mock: z.boolean().optional().default(false),
        requireWhisper: z.boolean().optional(),
        whisperModel: z.enum(['tiny', 'base', 'small', 'medium', 'large']).optional(),
        reconcile: z.boolean().optional(),
        saveToSession: z.boolean().optional().default(true),
      }),
      execute: async (
        args: {
          script?: ScriptOutput;
          scriptPath?: string;
          useSessionScript?: boolean;
          voice: string;
          speed?: number;
          outputPath?: string;
          timestampsPath?: string;
          mock?: boolean;
          requireWhisper?: boolean;
          whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
          reconcile?: boolean;
          saveToSession?: boolean;
        },
        context: McpToolContext
      ): Promise<AudioOutput> => {
        const session = await sessionStore.get(context);
        const { generateAudio } = await import('../../audio/pipeline');

        const scriptFromPath = args.scriptPath
          ? await readJsonFile(
              await resolveSessionPath(session, args.scriptPath, 'scriptPath'),
              ScriptOutputSchema
            )
          : undefined;

        const script = await requireSessionValue(
          session,
          args.script ??
            scriptFromPath ??
            (args.useSessionScript !== false ? session.lastScript : undefined),
          'script'
        );

        const outputPath = args.outputPath
          ? await resolveSessionPath(session, args.outputPath, 'outputPath')
          : `${session.artifactsDir}/${DEFAULT_ARTIFACT_FILENAMES.audio}`;
        const timestampsPath = args.timestampsPath
          ? await resolveSessionPath(session, args.timestampsPath, 'timestampsPath')
          : `${session.artifactsDir}/${DEFAULT_ARTIFACT_FILENAMES.timestamps}`;

        await mkdir(dirname(outputPath), { recursive: true });
        await mkdir(dirname(timestampsPath), { recursive: true });

        const output = await generateAudio({
          script,
          voice: args.voice,
          speed: args.speed,
          outputPath,
          timestampsPath,
          mock: args.mock,
          requireWhisper: args.requireWhisper,
          whisperModel: args.whisperModel,
          reconcile: args.reconcile,
        });

        const validated = AudioOutputSchema.parse(output);
        if (args.saveToSession !== false) {
          session.lastAudio = validated;
          session.lastTimestamps = validated.timestamps;
        }

        return validated;
      },
    },

    match_visuals: {
      name: 'match_visuals',
      description: 'Match visuals (stock footage / gameplay) for each timestamped scene.',
      parameters: z.object({
        timestamps: TimestampsOutputSchema.optional(),
        timestampsPath: z.string().optional(),
        useSessionTimestamps: z.boolean().optional().default(true),
        provider: z.enum(['pexels', 'pixabay', 'mock']).optional().default('pexels'),
        orientation: z.enum(['portrait', 'landscape', 'square']).optional().default('portrait'),
        mock: z.boolean().optional().default(false),
        gameplay: z
          .object({
            library: z.string().optional(),
            style: z.string().optional(),
            clip: z.string().optional(),
            required: z.boolean().optional(),
          })
          .optional(),
        saveToSession: z.boolean().optional().default(true),
        outputPath: z.string().optional(),
      }),
      execute: async (
        args: {
          timestamps?: TimestampsOutput;
          timestampsPath?: string;
          useSessionTimestamps?: boolean;
          provider?: ProviderName;
          orientation?: 'portrait' | 'landscape' | 'square';
          mock?: boolean;
          gameplay?: { library?: string; style?: string; clip?: string; required?: boolean };
          saveToSession?: boolean;
          outputPath?: string;
        },
        context: McpToolContext
      ): Promise<VisualsOutput> => {
        const session = await sessionStore.get(context);
        const { matchVisuals } = await import('../../visuals/matcher');

        const timestampsFromPath = args.timestampsPath
          ? await readJsonFile(
              await resolveSessionPath(session, args.timestampsPath, 'timestampsPath'),
              TimestampsOutputSchema
            )
          : undefined;

        const timestamps = await requireSessionValue(
          session,
          args.timestamps ??
            timestampsFromPath ??
            (args.useSessionTimestamps !== false ? session.lastTimestamps : undefined),
          'timestamps'
        );

        let output: unknown;
        try {
          output = await matchVisuals({
            timestamps,
            provider: args.provider,
            orientation: args.orientation,
            mock: args.mock,
            gameplay: args.gameplay,
            onProgress: async (event) => {
              if (context.reportProgress) {
                await context.reportProgress({
                  progress: Math.round(event.progress * 100),
                  total: 100,
                });
              }
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes('not yet implemented')) {
            const { UserError } = await loadFastMcp();
            throw new UserError(message);
          }
          throw error;
        }

        const validated = VisualsOutputSchema.parse(output);
        if (args.saveToSession !== false) session.lastVisuals = validated;
        await maybeWriteJsonFile(
          args.outputPath
            ? await resolveSessionPath(session, args.outputPath, 'outputPath')
            : undefined,
          validated
        );

        return validated;
      },
    },

    render_video: {
      name: 'render_video',
      description: 'Render the final video using Remotion.',
      parameters: z.object({
        visuals: VisualsOutputSchema.optional(),
        visualsPath: z.string().optional(),
        useSessionVisuals: z.boolean().optional().default(true),
        timestamps: TimestampsOutputSchema.optional(),
        timestampsPath: z.string().optional(),
        useSessionTimestamps: z.boolean().optional().default(true),
        audioPath: z.string().optional(),
        useSessionAudio: z.boolean().optional().default(true),
        outputPath: z.string().optional(),
        orientation: OrientationEnum.default('portrait'),
        fps: z.number().int().positive().optional(),
        captionPreset: CaptionPresetNameSchema.optional(),
        mock: z.boolean().optional().default(false),
        mockRenderMode: z.enum(['placeholder', 'real']).optional(),
        downloadAssets: z.boolean().optional(),
        saveToSession: z.boolean().optional().default(true),
      }),
      execute: async (
        args: {
          visuals?: VisualsOutput;
          visualsPath?: string;
          useSessionVisuals?: boolean;
          timestamps?: TimestampsOutput;
          timestampsPath?: string;
          useSessionTimestamps?: boolean;
          audioPath?: string;
          useSessionAudio?: boolean;
          outputPath?: string;
          orientation: z.infer<typeof OrientationEnum>;
          fps?: number;
          captionPreset?: CaptionPresetName;
          mock?: boolean;
          mockRenderMode?: 'placeholder' | 'real';
          downloadAssets?: boolean;
          saveToSession?: boolean;
        },
        context: McpToolContext
      ): Promise<RenderOutput> => {
        const session = await sessionStore.get(context);
        const { renderVideo } = await import('../../render/service');

        const visualsFromPath = args.visualsPath
          ? await readJsonFile(
              await resolveSessionPath(session, args.visualsPath, 'visualsPath'),
              VisualsOutputSchema
            )
          : undefined;
        const visuals = await requireSessionValue(
          session,
          args.visuals ??
            visualsFromPath ??
            (args.useSessionVisuals !== false ? session.lastVisuals : undefined),
          'visuals'
        );

        const timestampsFromPath = args.timestampsPath
          ? await readJsonFile(
              await resolveSessionPath(session, args.timestampsPath, 'timestampsPath'),
              TimestampsOutputSchema
            )
          : undefined;
        const timestamps = await requireSessionValue(
          session,
          args.timestamps ??
            timestampsFromPath ??
            (args.useSessionTimestamps !== false ? session.lastTimestamps : undefined),
          'timestamps'
        );

        const audioPath = await requireSessionValue(
          session,
          (args.audioPath
            ? await resolveSessionPath(session, args.audioPath, 'audioPath')
            : undefined) ??
            (args.useSessionAudio !== false ? session.lastAudio?.audioPath : undefined),
          'audioPath'
        );

        const outputPath = args.outputPath
          ? await resolveSessionPath(session, args.outputPath, 'outputPath')
          : `${session.artifactsDir}/${DEFAULT_ARTIFACT_FILENAMES.video}`;

        const output = await renderVideo({
          visuals,
          timestamps,
          audioPath,
          outputPath,
          orientation: args.orientation,
          fps: args.fps,
          captionPreset: args.captionPreset,
          mock: args.mock,
          mockRenderMode: args.mockRenderMode,
          downloadAssets: args.downloadAssets,
          onProgress: async (event) => {
            if (!context.reportProgress) return;
            const p = event.progress;
            if (typeof p !== 'number') return;
            await context.reportProgress({ progress: Math.round(p * 100), total: 100 });
          },
        });

        const validated = RenderOutputSchema.parse(output);
        if (args.saveToSession !== false) session.lastRender = validated;

        return validated;
      },
    },
  };

  return tools;
}

/**
 * Register Content Machine MCP tools on a FastMCP-compatible server.
 */
export function registerContentMachineMcpTools(params: {
  server: { addTool: (tool: any) => void };
  sessionStore: McpSessionStore;
}): void {
  const tools = createContentMachineMcpTools({ sessionStore: params.sessionStore });
  for (const tool of Object.values(tools)) {
    params.server.addTool(tool);
  }
}
