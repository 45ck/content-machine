/**
 * Quality Rank command — rank videos by uncertainty for active learning.
 *
 * Usage:
 *   cm quality-rank --features-dir features/ [--labeled-dir labeled/] [-o ranking.json]
 */
import { Command } from 'commander';
import { handleCommandError, writeOutputFile } from '../utils';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';

interface QualityRankCommandOptions {
  featuresDir: string;
  labeledDir?: string;
  output: string;
}

/** CLI command for ranking videos by quality uncertainty for active learning. */
export const qualityRankCommand = new Command('quality-rank')
  .description('Rank videos by quality uncertainty for active learning annotation')
  .requiredOption('--features-dir <dir>', 'Directory containing feature vector JSON files')
  .option('--labeled-dir <dir>', 'Directory of labeled embeddings for diversity ranking')
  .option('-o, --output <path>', 'Output ranking JSON path', 'ranking.json')
  .action(async (options: QualityRankCommandOptions) => {
    const runtime = getCliRuntime();
    const spinner = createSpinner('Ranking by uncertainty...').start();

    try {
      const { readdirSync, readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const { FeatureVectorSchema } = await import('../../domain');
      const { rankByQualityUncertainty } = await import('../../evaluate/active-learning');
      const { scoreQuality } = await import('../../quality-score/scorer');

      // Load feature vectors
      const files = readdirSync(options.featuresDir).filter((f) => f.endsWith('.json'));
      if (files.length === 0) {
        spinner.fail('No feature JSON files found in directory');
        process.exit(1);
        return;
      }

      const features = files.map((f) => {
        const raw = JSON.parse(readFileSync(join(options.featuresDir, f), 'utf-8'));
        return FeatureVectorSchema.parse(raw);
      });

      spinner.text = `Ranking ${features.length} videos...`;

      // Load labeled embeddings for diversity if provided
      let labeledEmbeddings: number[][] | undefined;
      if (options.labeledDir) {
        const labeledFiles = readdirSync(options.labeledDir).filter((f) => f.endsWith('.json'));
        labeledEmbeddings = labeledFiles
          .map((f) => {
            const raw = JSON.parse(readFileSync(join(options.labeledDir!, f), 'utf-8'));
            const parsed = FeatureVectorSchema.safeParse(raw);
            return parsed.success ? parsed.data.clipEmbedding : undefined;
          })
          .filter((e): e is number[] => !!e);
      }

      const rankings = await rankByQualityUncertainty(
        features,
        { scoreQuality: (opts) => scoreQuality({ ...opts, explain: false }) },
        labeledEmbeddings
      );

      const output = rankings.map((r, i) => ({
        rank: i + 1,
        videoId: r.videoId,
        uncertaintyScore: Math.round(r.uncertaintyScore * 1000) / 1000,
        diversityScore: Math.round(r.diversityScore * 1000) / 1000,
        combinedScore: Math.round(r.combinedScore * 1000) / 1000,
      }));

      await writeOutputFile(options.output, output);
      spinner.succeed(`Ranked ${rankings.length} videos by uncertainty`);

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'quality-rank',
            args: { featuresDir: options.featuresDir },
            outputs: { rankingPath: options.output, totalRanked: rankings.length },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
      } else {
        writeStderrLine(`Top 5 most uncertain:`);
        for (const r of output.slice(0, 5)) {
          writeStderrLine(`  #${r.rank} ${r.videoId} (uncertainty: ${r.uncertaintyScore})`);
        }
        writeStdoutLine(options.output);
      }

      process.exit(0);
    } catch (error) {
      spinner.fail('Quality ranking failed');
      handleCommandError(error);
    }
  });
