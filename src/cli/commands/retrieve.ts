/**
 * Retrieve command - Query local retrieval indexes (prototype)
 *
 * Usage: cm retrieve --index research.index.json --query "redis cache"
 */
import { Command } from 'commander';
import ora from 'ora';
import { readFile } from 'node:fs/promises';
import { handleCommandError } from '../utils';
import { HashEmbeddingProvider } from '../../core/embeddings/hash-embedder';
import { queryResearchEvidenceIndex, type ResearchIndexFile } from '../../research/indexer';

interface RetrieveOptions {
  index: string;
  query: string;
  k: string;
  json: boolean;
}

export const retrieveCommand = new Command('retrieve')
  .description('Query a local retrieval index (prototype)')
  .requiredOption('--index <path>', 'Path to a retrieval index JSON file')
  .requiredOption('-q, --query <query>', 'Query string')
  .option('-k, --k <number>', 'Top-k results', '5')
  .option('--json', 'Print results as JSON', false)
  .action(async (options: RetrieveOptions) => {
    const spinner = ora('Searching index...').start();
    try {
      const raw = await readFile(options.index, 'utf8');
      const index = JSON.parse(raw) as ResearchIndexFile;

      const embedder = new HashEmbeddingProvider();
      const results = await queryResearchEvidenceIndex({
        index,
        embedder,
        query: options.query,
        k: Number.parseInt(options.k, 10),
      });

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify({ query: options.query, results }, null, 2));
        return;
      }

      console.log(`\nQuery: "${options.query}"`);
      console.log(`Results: ${results.length}\n`);
      for (const r of results) {
        console.log(`- (${r.score.toFixed(3)}) ${r.evidence.title}`);
        console.log(`  ${r.evidence.url}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Search failed');
      handleCommandError(error);
    }
  });

