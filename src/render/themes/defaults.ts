/**
 * Archetype Theme Defaults
 *
 * Maps script archetype ids to default theme names.
 * Separate from registry for clear separation of concerns.
 */
// Note: Archetype ids are branded strings in code, but object literal keys are plain strings.
export const ARCHETYPE_THEME_DEFAULTS: Record<string, string> = {
  listicle: 'bold-tech',
  versus: 'future-pop',
  howto: 'clean-minimal',
  myth: 'earthy-warm',
  story: 'earthy-warm',
  'hot-take': 'future-pop',
};
