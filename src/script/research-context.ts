/**
 * Research Context Builder
 *
 * Formats research output into a prompt-friendly context for script generation.
 */
import type { ResearchOutput, Evidence, ContentAngle } from '../research/schema';

const MAX_CONTEXT_LENGTH = 2500;
const MAX_EVIDENCE_ITEMS = 10;

/**
 * Build a prompt-friendly context string from research output
 */
export function buildResearchContext(research: ResearchOutput): string {
  if (!research.evidence || research.evidence.length === 0) {
    return '';
  }

  const parts: string[] = [];

  // Add evidence section
  parts.push('## Research Evidence\n');
  parts.push('Use these verified facts in your script:\n');

  // Sort by relevance and take top items
  const sortedEvidence = [...research.evidence]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_EVIDENCE_ITEMS);

  for (const evidence of sortedEvidence) {
    const line = formatEvidence(evidence);
    parts.push(line);
  }

  // Add suggested angles if available
  if (research.suggestedAngles && research.suggestedAngles.length > 0) {
    parts.push('\n## Suggested Content Angles\n');
    for (const angle of research.suggestedAngles) {
      parts.push(formatAngle(angle));
    }
  }

  let context = parts.join('\n');

  // Truncate if too long
  if (context.length > MAX_CONTEXT_LENGTH) {
    context = context.slice(0, MAX_CONTEXT_LENGTH - 50) + '\n\n[...truncated for length]';
  }

  return context;
}

/**
 * Format a single evidence item
 */
function formatEvidence(evidence: Evidence): string {
  const parts = [`- **${evidence.title}** (${evidence.source}, relevance: ${(evidence.relevanceScore * 100).toFixed(0)}%)`];
  
  if (evidence.summary) {
    parts.push(`  ${evidence.summary}`);
  }
  
  parts.push(`  Source: ${evidence.url}`);
  
  return parts.join('\n');
}

/**
 * Format a content angle suggestion
 */
function formatAngle(angle: ContentAngle): string {
  return `- ${angle.archetype}: "${angle.angle}" (hook: "${angle.hook}")`;
}

/**
 * Extract source URLs from research for citation tracking
 */
export function extractSourceUrls(research: ResearchOutput): string[] {
  return research.evidence.map((e) => e.url);
}
