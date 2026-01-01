#!/usr/bin/env node
/**
 * Content Machine CLI
 *
 * Usage:
 *   npm run cli daily              # Run daily pipeline
 *   npm run cli weekly             # Run weekly research
 *   npm run cli status             # Show pipeline status
 */

import { Command } from 'commander';
import { PipelineOrchestrator } from './pipeline/orchestrator.js';
import { runWeeklyResearch } from './jobs/weekly-research.js';
import { reviewQueue } from './steps/5-human-review.js';

const program = new Command();

program
  .name('content-machine')
  .description('Automated short-form video generation pipeline')
  .version('0.1.0');

program
  .command('daily')
  .description('Run the daily content pipeline')
  .option('-t, --topic <topic>', 'Override topic (skip trend fetch)')
  .option('-d, --dry-run', 'Preview without generating')
  .action(async (options) => {
    console.log('🎬 Starting daily content pipeline...\n');

    const orchestrator = new PipelineOrchestrator();

    try {
      if (options.topic) {
        console.log(`Using manual topic: ${options.topic}`);
        // TODO: Create TrendItem from manual topic
      }

      if (options.dryRun) {
        console.log('[DRY RUN] Would execute pipeline steps 1A-5');
        console.log('  1A - Trend Ingest: Fetch Reddit, deduplicate');
        console.log('  1B - Planner: GPT-4o select topic + hook');
        console.log('  2  - Script: GPT-4o write scenes');
        console.log('  3  - Assets: TTS, Playwright, Pexels');
        console.log('  4  - Render: Remotion composition');
        console.log('  5  - Review: Queue for human approval');
        return;
      }

      // For now, create a mock trend item
      const mockTrend = {
        id: 'manual-001',
        source: 'manual' as const,
        title: options.topic || 'How to create a Discord bot in 60 seconds',
        url: '',
        score: 100,
        fetchedAt: new Date(),
        contentHash: 'manual',
      };

      const job = await orchestrator.runDailyPipeline(mockTrend);

      console.log('\n✅ Pipeline complete!');
      console.log(`Job ID: ${job.id}`);
      console.log(`Status: ${job.status}`);

      if (job.status === 'step-5-review') {
        console.log('\n📋 Waiting for human review.');
        console.log('Run "npm run cli review" to see pending items.');
      }
    } catch (error) {
      console.error('\n❌ Pipeline failed:', error);
      process.exit(1);
    }
  });

program
  .command('weekly')
  .description('Run weekly deep research')
  .option('-d, --dry-run', 'Preview without API calls')
  .action(async (options) => {
    console.log('🔬 Starting weekly deep research...\n');

    if (options.dryRun) {
      console.log('[DRY RUN] Would analyze:');
      console.log('  - Platform algorithm changes');
      console.log('  - Emerging trends');
      console.log('  - Competitor content');
      console.log('  - Generate weekly topic calendar');
      return;
    }

    try {
      const result = await runWeeklyResearch();

      console.log('\n✅ Weekly research complete!');
      console.log(`Research ID: ${result.id}`);
      console.log(`Tokens used: ${result.tokensUsed}`);
      console.log(`Est. cost: $${result.costEstimate.toFixed(4)}`);
      console.log(`\nWeekly topics:`);

      for (const topic of result.research.weeklyTopics) {
        console.log(`  ${topic.day}: ${topic.topic} [${topic.priority}]`);
      }
    } catch (error) {
      console.error('\n❌ Research failed:', error);
      process.exit(1);
    }
  });

program
  .command('review')
  .description('Show pending review items')
  .action(async () => {
    const pending = await reviewQueue.getPending();
    const stats = await reviewQueue.getStats();

    console.log('📋 Review Queue Status\n');
    console.log(`Pending: ${stats.pending}`);
    console.log(`Approved: ${stats.approved}`);
    console.log(`Rejected: ${stats.rejected}`);
    console.log(`Changes Requested: ${stats.changesRequested}`);

    if (pending.length === 0) {
      console.log('\nNo pending reviews.');
      return;
    }

    console.log('\nPending Items:');
    for (const item of pending) {
      console.log(`\n  [${item.priority.toUpperCase()}] ${item.id}`);
      console.log(`  Topic: ${item.trendTitle}`);
      console.log(`  Hook: ${item.hook}`);
      console.log(`  Created: ${item.createdAt.toISOString()}`);
    }
  });

program
  .command('status')
  .description('Show pipeline status')
  .action(async () => {
    console.log('📊 Content Machine Status\n');

    const stats = await reviewQueue.getStats();

    console.log('Review Queue:');
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Approved: ${stats.approved}`);
    console.log(`  Rejected: ${stats.rejected}`);

    // TODO: Add more status info
    // - Recent jobs
    // - Output files
    // - Analytics summary
  });

program.parse();
