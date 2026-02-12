/**
 * Prompts command - inspect prompt templates.
 */
import { Command } from 'commander';
import { CMError } from '../../core/errors';
import { PromptRegistry, getPrompt } from '../../prompts';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError } from '../utils';
import type {
  PromptCategory,
  PromptProvider,
  PromptSearchOptions,
  PromptTemplate,
} from '../../prompts';

function parsePositiveLimit(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 1000) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --limit value: ${value}`, {
      fix: 'Use an integer between 1 and 1000',
    });
  }
  return parsed;
}

function parseCsv(input: string | undefined): string[] | undefined {
  if (!input) return undefined;
  const values = input
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return values.length > 0 ? values : undefined;
}

function formatPromptLine(template: PromptTemplate): string {
  return `${template.id} [${template.category}/${template.provider}] - ${template.name}`;
}

function toSearchOptions(options: {
  category?: string;
  provider?: string;
  tags?: string;
  limit?: string;
}): PromptSearchOptions {
  return {
    category: options.category as PromptCategory | undefined,
    provider: options.provider as PromptProvider | undefined,
    tags: parseCsv(options.tags),
    limit: parsePositiveLimit(options.limit),
  };
}

export const promptsCommand = new Command('prompts')
  .description('Inspect and search prompt templates')
  .addCommand(
    new Command('list')
      .description('List prompt templates')
      .option('--category <category>', 'Filter by category')
      .option('--provider <provider>', 'Filter by provider')
      .option('--tags <csv>', 'Filter by tags (comma-separated, all required)')
      .option('--limit <n>', 'Maximum number of prompts to return')
      .action(async (options) => {
        try {
          const runtime = getCliRuntime();
          const searchOptions = toSearchOptions(options);
          const results = PromptRegistry.search(searchOptions);
          const prompts = results.map((result) => result.template);

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'prompts:list',
                args: {
                  category: options.category ?? null,
                  provider: options.provider ?? null,
                  tags: parseCsv(options.tags) ?? [],
                  limit: parsePositiveLimit(options.limit) ?? null,
                },
                outputs: { prompts },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          if (prompts.length === 0) {
            writeStderrLine('No prompt templates found.');
            return;
          }

          for (const prompt of prompts) {
            writeStderrLine(formatPromptLine(prompt));
          }
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('search')
      .description('Search prompt templates by free-text query')
      .argument('<query>', 'Search query')
      .option('--category <category>', 'Filter by category')
      .option('--provider <provider>', 'Filter by provider')
      .option('--tags <csv>', 'Filter by tags (comma-separated, all required)')
      .option('--limit <n>', 'Maximum number of prompts to return')
      .action(async (query, options) => {
        try {
          const runtime = getCliRuntime();
          const searchOptions = toSearchOptions(options);
          const results = PromptRegistry.search({ ...searchOptions, query: String(query) });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'prompts:search',
                args: {
                  query,
                  category: options.category ?? null,
                  provider: options.provider ?? null,
                  tags: parseCsv(options.tags) ?? [],
                  limit: parsePositiveLimit(options.limit) ?? null,
                },
                outputs: {
                  results: results.map((result) => ({
                    id: result.template.id,
                    name: result.template.name,
                    score: result.score,
                    matchedKeywords: result.matchedKeywords,
                    category: result.template.category,
                    provider: result.template.provider,
                  })),
                },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          if (results.length === 0) {
            writeStderrLine('No prompt templates matched your query.');
            return;
          }

          for (const result of results) {
            writeStderrLine(
              `${formatPromptLine(result.template)} (score=${result.score.toFixed(2)})`
            );
          }
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('show')
      .description('Show a single prompt template by id')
      .argument('<id>', 'Prompt template id')
      .action(async (id) => {
        try {
          const runtime = getCliRuntime();
          const template = getPrompt(String(id));
          if (!template) {
            throw new CMError('NOT_FOUND', `Unknown prompt template: ${id}`, {
              fix: 'Run `cm prompts list` to see available template ids',
            });
          }

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'prompts:show',
                args: { id },
                outputs: { prompt: template },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine(`Prompt: ${template.id}`);
          writeStderrLine(`Name: ${template.name}`);
          writeStderrLine(`Category: ${template.category}`);
          writeStderrLine(`Provider: ${template.provider}`);
          writeStderrLine(`Version: ${template.version}`);
          writeStderrLine(`Tags: ${template.tags.join(', ')}`);
          writeStderrLine('Variables:');
          if (template.variables.length === 0) {
            writeStderrLine('- (none)');
          } else {
            for (const variable of template.variables) {
              writeStderrLine(
                `- ${variable.name}${variable.required ? ' (required)' : ''}: ${variable.description}`
              );
            }
          }
          writeStderrLine('Template:');
          writeStderrLine(template.template);
        } catch (error) {
          handleCommandError(error);
        }
      })
  );
