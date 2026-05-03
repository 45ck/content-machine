#!/usr/bin/env node
import {
  AssetLedgerRequestSchema,
  BriefToScriptRequestSchema,
  BoundarySnapRequestSchema,
  CaptionExportRequestSchema,
  DoctorReportRequestSchema,
  FlowCatalogRequestSchema,
  GenerateShortRequestSchema,
  HighlightApprovalRequestSchema,
  IngestRequestSchema,
  InstallSkillPackRequestSchema,
  LongformClipExtractRequestSchema,
  LongformToShortsRequestSchema,
  LongformHighlightSelectRequestSchema,
  MediaIndexRequestSchema,
  RedditStoryAssetsRequestSchema,
  PublishPrepRequestSchema,
  RunFlowRequestSchema,
  ScriptToAudioRequestSchema,
  SkillCatalogRequestSchema,
  SourceMediaAnalyzeRequestSchema,
  StyleProfileLibraryRequestSchema,
  TimestampsToVisualsRequestSchema,
  VideoRenderRequestSchema,
  runAssetLedger,
  installSkillPack,
  runRedditStoryAssets,
  runBoundarySnap,
  runHighlightApproval,
  runLongformClipExtract,
  runLongformHighlightSelect,
  runLongformToShorts,
  runMediaIndex,
  runSourceMediaAnalyze,
  runStyleProfileLibrary,
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
  'asset-ledger': {
    tool: 'content-machine/asset-ledger',
    inputSchema: AssetLedgerRequestSchema,
    handler: async ({ input }) => runAssetLedger(input),
  },
  'boundary-snap': {
    tool: 'content-machine/boundary-snap',
    inputSchema: BoundarySnapRequestSchema,
    handler: async ({ input }) => runBoundarySnap(input),
  },
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
  'highlight-approval': {
    tool: 'content-machine/highlight-approval',
    inputSchema: HighlightApprovalRequestSchema,
    handler: async ({ input }) => runHighlightApproval(input),
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
  'longform-highlight-select': {
    tool: 'content-machine/longform-highlight-select',
    inputSchema: LongformHighlightSelectRequestSchema,
    handler: async ({ input }) => runLongformHighlightSelect(input),
  },
  'longform-clip-extract': {
    tool: 'content-machine/longform-clip-extract',
    inputSchema: LongformClipExtractRequestSchema,
    handler: async ({ input }) => runLongformClipExtract(input),
  },
  'longform-to-shorts': {
    tool: 'content-machine/longform-to-shorts',
    inputSchema: LongformToShortsRequestSchema,
    handler: async ({ input }) => runLongformToShorts(input),
  },
  'media-index': {
    tool: 'content-machine/media-index',
    inputSchema: MediaIndexRequestSchema,
    handler: async ({ input }) => runMediaIndex(input),
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
  'publish-prep-review': {
    tool: 'content-machine/publish-prep-review',
    inputSchema: PublishPrepRequestSchema,
    handler: async ({ input }) => runPublishPrep(input),
  },
  'reverse-engineer-winner': {
    tool: 'content-machine/reverse-engineer-winner',
    inputSchema: IngestRequestSchema,
    handler: async ({ input }) => ingestReferenceVideo(input),
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
  'source-media-analyze': {
    tool: 'content-machine/source-media-analyze',
    inputSchema: SourceMediaAnalyzeRequestSchema,
    handler: async ({ input }) => runSourceMediaAnalyze(input),
  },
  'style-profile-library': {
    tool: 'content-machine/style-profile-library',
    inputSchema: StyleProfileLibraryRequestSchema,
    handler: async ({ input }) => runStyleProfileLibrary(input),
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

const supportedTools = Object.keys(registry).sort();

function printUsage(stream) {
  stream.write('Usage: run-tool.mjs <tool> < request.json\n');
  stream.write('       run-tool.mjs list\n');
  stream.write('       run-tool.mjs --help\n');
  stream.write(`Supported tools: ${supportedTools.join(', ')}\n`);
}

if (toolName === 'list') {
  process.stdout.write(`${JSON.stringify({ tools: supportedTools }, null, 2)}\n`);
  process.exit(0);
}

if (!toolName || toolName === '--help' || toolName === '-h') {
  printUsage(process.stdout);
  process.exit(0);
}

if (!(toolName in registry)) {
  process.stderr.write(`Unsupported tool: ${toolName}\n`);
  printUsage(process.stderr);
  process.exit(1);
}

await runHarnessTool(registry[toolName]);
