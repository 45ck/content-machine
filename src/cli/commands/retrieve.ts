/**
 * Retrieve command - Query local retrieval indexes (prototype)
 *
 * Usage: cm retrieve --index research.index.json --query "redis cache"
 */
import { Command } from 'commander';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { HashEmbeddingProvider } from '../../core/embeddings/hash-embedder';
import { queryResearchEvidenceIndex, parseResearchIndexFile } from '../../research/indexer';
import { CMError } from '../../core/errors';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import {
  buildJsonEnvelope,
  writeJsonEnvelope,
  writeStderrLine,
  writeStdoutLine,
} from '../output';

interface RetrieveOptions {
  index: string;
  query: string;
  k: string;
  output: string;
}

export const retrieveCommand = new Command('retrieve')
  .description('Query a local retrieval index (prototype)')
  .requiredOption('--index <path>', 'Path to a retrieval index JSON file')
  .requiredOption('-q, --query <query>', 'Query string')
  .option('-k, --k <number>', 'Top-k results', '5')
  .option('-o, --output <path>', 'Output results JSON file', 'retrieve.json')
  .action(async (options: RetrieveOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Searching index...').start();
    try {
      const raw = await readInputFile(options.index);
      const index = parseResearchIndexFile(raw);
      const k = Number.parseInt(options.k, 10);
      if (!Number.isFinite(k) || k <= 0) {
        throw new CMError('INVALID_ARGUMENT', `Invalid -k value: ${options.k}`, {
          fix: 'Use a positive integer for -k',
        });
      }

      const embedder = new HashEmbeddingProvider({ dimensions: index.dimensions });
      const results = await queryResearchEvidenceIndex({
        index,
        embedder,
        query: options.query,
        k,
      });

      const output = { query: options.query, results };
      await writeOutputFile(options.output, output);
      spinner.succeed(`Search complete (${results.length} results)`);

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'retrieve',
            args: {
              index: options.index,
              query: options.query,
              k,
              output: options.output,
            },
            outputs: {
              resultsPath: options.output,
              results: results.length,
              topScore: results[0]?.score ?? null,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      writeStderrLine(`Query: "${options.query}"`);
      writeStderrLine(`Results: ${results.length}`);
      for (const r of results.slice(0, 5)) {
        writeStderrLine(`- (${r.score.toFixed(3)}) ${r.evidence.title}`);
        writeStderrLine(`  ${r.evidence.url}`);
      }

      // Human-mode stdout should be reserved for the primary artifact path.
      writeStdoutLine(options.output);
    } catch (error) {
      spinner.fail('Search failed');
      handleCommandError(error);
    }
  });
