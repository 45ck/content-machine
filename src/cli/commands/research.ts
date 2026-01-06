/**
 * Research command - Gather evidence from multiple sources
 *
 * Usage: cm research --query "AI programming trends" --sources hackernews,reddit
 */
import { Command } from 'commander';
import ora from 'ora';
import { logger } from '../../core/logger';
import { ResearchSourceEnum } from '../../research/schema';
import type { ResearchSource } from '../../research/schema';
import { createResearchOrchestrator } from '../../research/orchestrator';
import type { OrchestratorResult } from '../../research/orchestrator';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { OpenAIProvider } from '../../core/llm/openai';
import { handleCommandError, writeOutputFile } from '../utils';
import { HashEmbeddingProvider } from '../../core/embeddings/hash-embedder';
import { buildResearchEvidenceIndex } from '../../research/indexer';

interface ResearchOptions {
  query: string;
  sources: string;
  output: string;
  index: string;
  limit: string;
  timeRange: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  angles: boolean;
  maxAngles: string;
  sequential: boolean;
  dryRun: boolean;
  mock: boolean;
}

function parseSources(sourcesStr: string): ResearchSource[] {
  const sourceList = sourcesStr.split(',').map((s: string) => s.trim());
  const validSources: ResearchSource[] = [];

  for (const source of sourceList) {
    const parsed = ResearchSourceEnum.safeParse(source);
    if (parsed.success) {
      validSources.push(parsed.data);
    }
  }

  return validSources;
}

function createMockLLMProvider(query: string): FakeLLMProvider {
  const provider = new FakeLLMProvider();
  provider.queueJsonResponse([
    {
      angle: `Top insights about "${query}"`,
      hook: 'You need to see this',
      archetype: 'listicle',
      targetEmotion: 'curiosity',
      confidence: 0.85,
    },
    {
      angle: `Common misconceptions about "${query}"`,
      hook: 'Everyone gets this wrong',
      archetype: 'myth',
      targetEmotion: 'surprise',
      confidence: 0.8,
    },
  ]);
  return provider;
}

function displaySummary(
  query: string,
  result: OrchestratorResult,
  output: string,
  mock: boolean
): void {
  console.log(`\nResearch: "${query}"`);
  console.log(`   Sources searched: ${result.output.sources.join(', ')}`);
  console.log(`   Evidence found: ${result.output.totalResults}`);

  if (result.output.suggestedAngles && result.output.suggestedAngles.length > 0) {
    console.log(`   Content angles: ${result.output.suggestedAngles.length}`);
    for (const angle of result.output.suggestedAngles) {
      console.log(`      • ${angle.archetype}: "${angle.hook}"`);
    }
  }

  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.length} source(s) failed`);
  }

  console.log(`   Output: ${output}`);
  console.log(`   Time: ${result.timingMs.total}ms`);
  if (mock) console.log('   Mock mode - angles are for testing only');
  console.log('');
}

async function executeResearch(
  options: ResearchOptions,
  validSources: ResearchSource[]
): Promise<void> {
  const spinner = ora('Researching topic...').start();

  // Create LLM provider for angle generation
  let llmProvider;
  if (options.angles) {
    if (options.mock) {
      llmProvider = createMockLLMProvider(options.query);
    } else if (process.env.OPENAI_API_KEY) {
      llmProvider = new OpenAIProvider('gpt-4o-mini', process.env.OPENAI_API_KEY);
    }
  }

  const orchestrator = createResearchOrchestrator(
    {
      sources: validSources,
      limitPerSource: parseInt(options.limit, 10),
      timeRange: options.timeRange,
      generateAngles: options.angles,
      maxAngles: parseInt(options.maxAngles, 10),
      parallel: !options.sequential,
    },
    llmProvider
  );

  spinner.text = `Searching ${validSources.length} sources...`;
  const result = await orchestrator.research(options.query);

  for (const error of result.errors) {
    logger.warn({ source: error.source, error: error.error }, 'Source error');
  }

  spinner.succeed(`Research complete (${result.timingMs.total}ms)`);

  await writeOutputFile(options.output, result.output);
  logger.info({ output: options.output }, 'Research saved');

  if (options.index) {
    const embedder = new HashEmbeddingProvider();
    const index = await buildResearchEvidenceIndex(result.output.evidence, embedder);
    await writeOutputFile(options.index, index);
    logger.info({ output: options.index }, 'Research index saved');
  }

  displaySummary(options.query, result, options.output, options.mock);
}

export const researchCommand = new Command('research')
  .description('Research a topic across multiple sources')
  .requiredOption('-q, --query <query>', 'Search query')
  .option(
    '-s, --sources <sources>',
    'Comma-separated sources (hackernews,reddit,web,tavily)',
    'hackernews,reddit'
  )
  .option('-o, --output <path>', 'Output file path', 'research.json')
  .option('--index <path>', 'Optional: write a local retrieval index JSON', '')
  .option('-l, --limit <number>', 'Results per source', '10')
  .option('-t, --time-range <range>', 'Time range (hour,day,week,month,year,all)', 'week')
  .option('--no-angles', 'Skip content angle generation')
  .option('--max-angles <number>', 'Maximum angles to generate', '3')
  .option('--sequential', 'Run searches sequentially instead of parallel')
  .option('--dry-run', 'Preview without making API calls')
  .option('--mock', 'Use mock LLM for angle generation')
  .action(async (options: ResearchOptions) => {
    const spinner = ora('Validating sources...').start();

    try {
      const validSources = parseSources(options.sources);

      if (validSources.length === 0) {
        throw new Error('No valid sources specified');
      }

      if (options.dryRun) {
        spinner.stop();
        console.log('\nDry-run mode - no API calls made\n');
        console.log(`   Query: ${options.query}`);
        console.log(`   Sources: ${validSources.join(', ')}`);
        console.log(`   Limit per source: ${options.limit}`);
        console.log(`   Time range: ${options.timeRange}`);
        console.log(`   Generate angles: ${options.angles}`);
        console.log(`   Output: ${options.output}`);
        console.log('');
        return;
      }

      spinner.stop();
      logger.info({ query: options.query, sources: validSources }, 'Starting research');
      await executeResearch(options, validSources);
    } catch (error) {
      spinner.fail('Research failed');
      handleCommandError(error);
    }
  });
