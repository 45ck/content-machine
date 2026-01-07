/**
 * Publish command - Generate publish metadata + checklist
 *
 * Usage: cm publish --input script.json --output publish.json
 */
import { Command } from 'commander';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { ScriptOutputSchema } from '../../script/schema';
import { PackageOutputSchema, PlatformEnum } from '../../package/schema';
import { generatePublish } from '../../publish/generator';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';

interface PublishOptions {
  input: string;
  platform: string;
  package?: string;
  output: string;
  llm: boolean;
  mock: boolean;
}

export const publishCommand = new Command('publish')
  .description('Generate publish metadata + checklist and write publish.json')
  .requiredOption('-i, --input <path>', 'Input script.json path')
  .option('--platform <platform>', 'Platform (tiktok|reels|shorts)', 'tiktok')
  .option('--package <path>', 'Optional packaging.json path')
  .option('-o, --output <path>', 'Output publish.json path', 'publish.json')
  .option('--llm', 'Use LLM to generate description/hashtags/checklist (requires API key)', false)
  .option('--mock', 'Mock LLM output (for tests/dev)', false)
  .action(async (options: PublishOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Generating publish metadata...').start();
    try {
      const rawScript = await readInputFile(options.input);
      const script = ScriptOutputSchema.parse(rawScript);

      const platform = PlatformEnum.parse(options.platform);
      const packaging = options.package
        ? PackageOutputSchema.parse(await readInputFile(options.package))
        : undefined;

      const llmProvider = options.mock
        ? (() => {
            const fake = new FakeLLMProvider();
            fake.queueJsonResponse({
              description: `Description for ${script.title ?? 'video'}`,
              hashtags: script.hashtags ?? ['#shorts'],
              checklist: [
                { id: 'render-quality', label: 'Video passes validation', required: true },
              ],
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
      spinner.succeed('Publish metadata generated');

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'publish',
            args: {
              input: options.input,
              package: options.package ?? null,
              platform,
              output: options.output,
              mode: options.llm || options.mock ? 'llm' : 'deterministic',
              mock: Boolean(options.mock),
            },
            outputs: {
              publishPath: options.output,
              title: out.title,
              hashtags: out.hashtags.length,
              checklist: out.checklist.length,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      writeStderrLine(`Publish: ${platform}`);
      writeStderrLine(`   Title: ${out.title}`);
      writeStderrLine(`   Hashtags: ${out.hashtags.slice(0, 8).join(' ')}`);
      if (options.mock) writeStderrLine('   Mock mode - LLM output is for testing only');

      // Human-mode stdout should be reserved for the primary artifact path.
      process.stdout.write(`${options.output}\n`);
    } catch (error) {
      spinner.fail('Publish failed');
      handleCommandError(error);
    }
  });
