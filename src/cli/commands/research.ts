/**
 * Research command - Gather evidence from multiple sources
 *
 * Usage: cm research --query "AI programming trends" --sources hackernews,reddit
 */
import { Command } from 'commander';
import { logger } from '../../core/logger';
import { ResearchSourceEnum } from '../../research/schema';
import type { ResearchSource } from '../../research/schema';
import { createResearchOrchestrator } from '../../research/orchestrator';
import type { OrchestratorResult } from '../../research/orchestrator';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { handleCommandError, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope } from '../output';

interface ResearchOptions {
  query: string;
  sources: string;
  output: string;
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
      console.log(`      - ${angle.archetype}: "${angle.hook}"`);
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
): Promise<OrchestratorResult> {
  const spinner = createSpinner('Researching topic...').start();

  const llmProvider =
    options.angles && options.mock ? createMockLLMProvider(options.query) : undefined;

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

  return result;
}

export const researchCommand = new Command('research')
  .description('Research a topic across multiple sources')
  .requiredOption('-q, --query <query>', 'Search query')
  .option(
    '-s, --sources <sources>',
    'Comma-separated sources (hackernews,reddit,web)',
    'hackernews,reddit'
  )
  .option('-o, --output <path>', 'Output file path', 'research.json')
  .option('-l, --limit <number>', 'Results per source', '10')
  .option('-t, --time-range <range>', 'Time range (hour,day,week,month,year,all)', 'week')
  .option('--no-angles', 'Skip content angle generation')
  .option('--max-angles <number>', 'Maximum angles to generate', '3')
  .option('--sequential', 'Run searches sequentially instead of parallel')
  .option('--dry-run', 'Preview without making API calls')
  .option('--mock', 'Use mock LLM for angle generation')
  .action(async (options: ResearchOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Validating sources...').start();

    try {
      const validSources = parseSources(options.sources);

      if (validSources.length === 0) {
        throw new Error('No valid sources specified');
      }

      if (options.dryRun) {
        spinner.stop();
        if (runtime.json) {
          writeJsonEnvelope(
            buildJsonEnvelope({
              command: 'research',
              args: {
                query: options.query,
                sources: validSources,
                limit: options.limit,
                timeRange: options.timeRange,
                angles: options.angles,
                maxAngles: options.maxAngles,
                output: options.output,
                dryRun: true,
              },
              outputs: { dryRun: true },
              timingsMs: Date.now() - runtime.startTime,
            })
          );
          return;
        }

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
      const result = await executeResearch(options, validSources);

      await writeOutputFile(options.output, result.output);
      logger.info({ output: options.output }, 'Research saved');

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'research',
            args: {
              query: options.query,
              sources: validSources,
              limit: options.limit,
              timeRange: options.timeRange,
              angles: options.angles,
              maxAngles: options.maxAngles,
              output: options.output,
              sequential: options.sequential,
            },
            outputs: {
              researchPath: options.output,
              sources: result.output.sources,
              totalResults: result.output.totalResults,
              angles: result.output.suggestedAngles?.length ?? 0,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      displaySummary(options.query, result, options.output, options.mock);
    } catch (error) {
      spinner.fail('Research failed');
      handleCommandError(error);
    }
  });
