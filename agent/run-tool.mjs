#!/usr/bin/env node
import {
  BriefToScriptRequestSchema,
  CaptionExportRequestSchema,
  DoctorReportRequestSchema,
  FlowCatalogRequestSchema,
  GenerateShortRequestSchema,
  IngestRequestSchema,
  InstallSkillPackRequestSchema,
  RedditStoryAssetsRequestSchema,
  PublishPrepRequestSchema,
  RunFlowRequestSchema,
  ScriptToAudioRequestSchema,
  SkillCatalogRequestSchema,
  TimestampsToVisualsRequestSchema,
  VideoRenderRequestSchema,
  installSkillPack,
  runRedditStoryAssets,
  listFlowCatalog,
  listSkillCatalog,
  runDoctorReport,
  runFlowHandler,
  runGenerateShort,
  runHarnessTool,
  runPublishPrep,
  runScriptToAudio,
  runTimestampsToVisuals,
  runVideoRender,
  generateBriefToScript,
  runCaptionExport,
  ingestReferenceVideo,
} from '../dist/index.js';

const toolName = process.argv[2];

const registry = {
  'brief-to-script': {
    tool: 'content-machine/brief-to-script',
    inputSchema: BriefToScriptRequestSchema,
    handler: async ({ input }) => generateBriefToScript(input),
  },
  'caption-export': {
    tool: 'content-machine/caption-export',
    inputSchema: CaptionExportRequestSchema,
    handler: async ({ input }) => runCaptionExport(input),
  },
  'doctor-report': {
    tool: 'content-machine/doctor-report',
    inputSchema: DoctorReportRequestSchema,
    handler: async ({ input }) => runDoctorReport(input),
  },
  'flow-catalog': {
    tool: 'content-machine/flow-catalog',
    inputSchema: FlowCatalogRequestSchema,
    handler: async ({ input }) => listFlowCatalog(input),
  },
  'generate-short': {
    tool: 'content-machine/generate-short',
    inputSchema: GenerateShortRequestSchema,
    handler: async ({ input }) => runGenerateShort(input),
  },
  ingest: {
    tool: 'content-machine/ingest',
    inputSchema: IngestRequestSchema,
    handler: async ({ input }) => ingestReferenceVideo(input),
  },
  'install-skill-pack': {
    tool: 'content-machine/install-skill-pack',
    inputSchema: InstallSkillPackRequestSchema,
    handler: async ({ input }) => installSkillPack(input),
  },
  'reddit-story-assets': {
    tool: 'content-machine/reddit-story-assets',
    inputSchema: RedditStoryAssetsRequestSchema,
    handler: async ({ input }) => runRedditStoryAssets(input),
  },
  'publish-prep': {
    tool: 'content-machine/publish-prep',
    inputSchema: PublishPrepRequestSchema,
    handler: async ({ input }) => runPublishPrep(input),
  },
  'run-flow': {
    tool: 'content-machine/run-flow',
    inputSchema: RunFlowRequestSchema,
    handler: runFlowHandler,
  },
  'script-to-audio': {
    tool: 'content-machine/script-to-audio',
    inputSchema: ScriptToAudioRequestSchema,
    handler: async ({ input }) => runScriptToAudio(input),
  },
  'skill-catalog': {
    tool: 'content-machine/skill-catalog',
    inputSchema: SkillCatalogRequestSchema,
    handler: async ({ input }) => listSkillCatalog(input),
  },
  'timestamps-to-visuals': {
    tool: 'content-machine/timestamps-to-visuals',
    inputSchema: TimestampsToVisualsRequestSchema,
    handler: async ({ input }) => runTimestampsToVisuals(input),
  },
  'video-render': {
    tool: 'content-machine/video-render',
    inputSchema: VideoRenderRequestSchema,
    handler: async ({ input }) => runVideoRender(input),
  },
};

if (!toolName || !(toolName in registry)) {
  const supported = Object.keys(registry).sort();
  process.stderr.write(
    `Expected a supported tool name as the first argument.\nSupported tools: ${supported.join(', ')}\n`
  );
  process.exit(1);
}

await runHarnessTool(registry[toolName]);
