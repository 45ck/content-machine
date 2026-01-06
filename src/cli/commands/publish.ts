/**
 * Publish command - Generate publish metadata + checklist
 *
 * Usage: cm publish --input script.json --output publish.json
 */
import { Command } from 'commander';
import ora from 'ora';
import { readFile } from 'node:fs/promises';
import { handleCommandError, writeOutputFile } from '../utils';
import { ScriptOutputSchema } from '../../script/schema';
import { PackageOutputSchema, PlatformEnum } from '../../package/schema';
import { generatePublish } from '../../publish/generator';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';

interface PublishOptions {
  input: string;
  platform: string;
  package?: string;
  output: string;
  llm: boolean;
  mock: boolean;
  json: boolean;
}

export const publishCommand = new Command('publish')
  .description('Generate publish metadata + checklist and write publish.json')
  .requiredOption('-i, --input <path>', 'Input script.json path')
  .option('--platform <platform>', 'Platform (tiktok|reels|shorts)', 'tiktok')
  .option('--package <path>', 'Optional packaging.json path')
  .option('-o, --output <path>', 'Output publish.json path', 'publish.json')
  .option('--llm', 'Use LLM to generate description/hashtags/checklist (requires API key)', false)
  .option('--mock', 'Mock LLM output (for tests/dev)', false)
  .option('--json', 'Print publish.json to stdout', false)
  .action(async (options: PublishOptions) => {
    const spinner = ora('Generating publish metadata...').start();
    try {
      const rawScript = JSON.parse(await readFile(options.input, 'utf8')) as unknown;
      const script = ScriptOutputSchema.parse(rawScript);

      const platform = PlatformEnum.parse(options.platform);
      const packaging = options.package
        ? PackageOutputSchema.parse(JSON.parse(await readFile(options.package, 'utf8')) as unknown)
        : undefined;

      const llmProvider = options.mock
        ? (() => {
            const fake = new FakeLLMProvider();
            fake.queueJsonResponse({
              description: `Description for ${script.title ?? 'video'}`,
              hashtags: script.hashtags ?? ['#shorts'],
              checklist: [{ id: 'render-quality', label: 'Video passes validation', required: true }],
            });
            return fake;
          })()
        : undefined;

      const out = await generatePublish({
        script,
        packaging,
        platform,
        mode: options.llm || options.mock ? 'llm' : 'deterministic',
        llmProvider,
      });

      await writeOutputFile(options.output, out);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(out, null, 2));
        return;
      }

      console.log(`\nPublish metadata generated (${platform})`);
      console.log(`Title: ${out.title}`);
      console.log(`Hashtags: ${out.hashtags.slice(0, 8).join(' ')}`);
      console.log(`Output: ${options.output}\n`);
    } catch (error) {
      spinner.fail('Publish failed');
      handleCommandError(error);
    }
  });

