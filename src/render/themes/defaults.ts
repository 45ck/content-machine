/**
 * Archetype Theme Defaults
 *
 * Maps content archetypes to default theme names.
 * Separate from registry for clear separation of concerns.
 */
import type { Archetype } from '../../core/config';

export const ARCHETYPE_THEME_DEFAULTS: Record<Archetype, string> = {
  listicle: 'bold-tech',
  versus: 'future-pop',
  howto: 'clean-minimal',
  myth: 'earthy-warm',
  story: 'earthy-warm',
  'hot-take': 'future-pop',
};
