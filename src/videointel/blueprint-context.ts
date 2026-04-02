/**
 * Blueprint Context Builder
 *
 * Renders a VideoBlueprint into prompt-friendly context text for script generation.
 * Follows the same pattern as research-context.ts.
 *
 * @module videointel
 */
import type { VideoBlueprintV1, SceneSlot } from '../domain';

const MAX_CONTEXT_LENGTH = 2000;

/**
 * Build a prompt-friendly context string from a VideoBlueprint.
 *
 * @internal
 */
export function buildBlueprintContext(blueprint: VideoBlueprintV1): string {
  const parts: string[] = [];

  parts.push('BLUEPRINT CONSTRAINTS (from a reference video):');
  parts.push('IMPORTANT: These constraints OVERRIDE any archetype template defaults.');
  parts.push('You MUST follow the scene count and duration below, even if the archetype');
  parts.push('template suggests different numbers.');
  parts.push('');

  // Structure summary — hard constraints
  const sceneCount = blueprint.scene_slots.length;
  const roleFlow = blueprint.scene_slots.map((s) => s.role).join(' → ');
  parts.push(`- REQUIRED scene count: EXACTLY ${sceneCount} scene${sceneCount === 1 ? '' : 's'} (not more, not fewer)`);
  if (sceneCount <= 2) {
    parts.push(`  WARNING: This is a ${sceneCount === 1 ? 'single-scene' : 'two-scene'} video.`);
    parts.push('  Do NOT add extra list items or numbered points. Ignore any archetype');
    parts.push('  instructions about "4-5 items" or "numbered points". Write exactly');
    parts.push(`  ${sceneCount} scene${sceneCount === 1 ? '' : 's'} of spoken content.`);
  }
  parts.push(`- Structure: ${sceneCount} scenes — ${roleFlow}`);

  // Per-scene constraints
  for (const slot of blueprint.scene_slots) {
    parts.push(formatSceneSlot(slot));
  }

  parts.push('');

  // Pacing
  const pacing = blueprint.pacing_profile;
  const pacingLabel = pacing.classification ?? 'unknown';
  parts.push(`- Pacing: ${pacingLabel} (avg ${pacing.avg_shot_duration.toFixed(1)}s/shot)`);
  parts.push(`- REQUIRED total duration: ~${Math.round(pacing.target_duration)}s (aim for this exact length)`);

  // Audio
  if (blueprint.audio_profile.has_voiceover) {
    const speakers = blueprint.audio_profile.speaker_count;
    parts.push(
      `- Voiceover: yes${speakers ? ` (${speakers} speaker${speakers > 1 ? 's' : ''})` : ''}`
    );
  }
  if (blueprint.audio_profile.has_music) {
    const bpm = blueprint.audio_profile.bpm;
    parts.push(`- Music: yes${bpm ? ` (~${bpm} BPM)` : ''}`);
  }

  // Captions
  if (blueprint.caption_profile.present) {
    parts.push(`- Captions: ${blueprint.caption_profile.style ?? 'present'}`);
  }

  // Narrative
  const ns = blueprint.narrative_structure;
  if (ns.hook_duration > 0) {
    parts.push(`- Hook duration: ${ns.hook_duration.toFixed(1)}s`);
  }
  if (ns.has_cta) {
    parts.push('- Includes CTA');
  }

  // Inserted content
  if (blueprint.inserted_content_pattern.present) {
    const count = blueprint.inserted_content_pattern.count ?? 0;
    const types = blueprint.inserted_content_pattern.types?.join(', ') ?? 'mixed';
    parts.push(`- Inserted content: ${count} block(s) (${types})`);
  }

  let context = parts.join('\n');

  if (context.length > MAX_CONTEXT_LENGTH) {
    context = context.slice(0, MAX_CONTEXT_LENGTH - 30) + '\n[...truncated]';
  }

  return context;
}

function formatSceneSlot(slot: SceneSlot): string {
  const min = slot.duration_range.min.toFixed(0);
  const max = slot.duration_range.max.toFixed(0);
  const duration = min === max ? `${min}s` : `${min}-${max}s`;
  const visual = slot.visual_type.replace(/_/g, ' ');
  return `- Scene ${slot.index + 1} (${slot.role}): ${duration}, ${visual}`;
}
