/**
 * Split-screen layout calculation helpers.
 *
 * Kept as a pure module so we can V&V-test layout behavior without React/Remotion.
 */

export type SplitScreenPosition = 'top' | 'bottom' | 'full';

export interface SplitRect {
  top: number;
  height: number;
}

export interface SplitScreenLayoutInput {
  height: number;
  /** Height ratio for the top slot (0.3..0.7). Defaults to 0.55. */
  ratio?: number;
  contentPosition?: SplitScreenPosition;
  gameplayPosition?: SplitScreenPosition;
}

export interface SplitScreenLayoutResult {
  ratio: number;
  topHeight: number;
  bottomHeight: number;
  content: SplitRect;
  gameplay: SplitRect;
  /**
   * Caption container rect.
   *
   * Design choice: always full-frame so CapCut-style bottom captions don't jump
   * upward when the content slot is positioned in the top half.
   */
  captions: SplitRect;
  resolvedContentPosition: SplitScreenPosition;
  resolvedGameplayPosition: SplitScreenPosition;
  isContentFull: boolean;
  isGameplayFull: boolean;
  contentOnTop: boolean;
}

function clampRatio(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeSplitScreenLayout(input: SplitScreenLayoutInput): SplitScreenLayoutResult {
  const ratio = clampRatio(input.ratio ?? 0.55, 0.3, 0.7);
  const resolvedContentPosition: SplitScreenPosition = input.contentPosition ?? 'top';
  const resolvedGameplayPosition: SplitScreenPosition =
    input.gameplayPosition ?? (resolvedContentPosition === 'bottom' ? 'top' : 'bottom');

  const isGameplayFull = resolvedGameplayPosition === 'full';
  const isContentFull = resolvedContentPosition === 'full';

  const topHeight = Math.round(input.height * ratio);
  const bottomHeight = input.height - topHeight;

  const contentOnTop = resolvedContentPosition === 'top';
  const contentHeight = isContentFull ? input.height : contentOnTop ? topHeight : bottomHeight;
  const contentTop = isContentFull ? 0 : contentOnTop ? 0 : topHeight;

  const gameplayHeight = isGameplayFull ? input.height : contentOnTop ? bottomHeight : topHeight;
  const gameplayTop = isGameplayFull ? 0 : contentOnTop ? topHeight : 0;

  return {
    ratio,
    topHeight,
    bottomHeight,
    content: { top: contentTop, height: contentHeight },
    gameplay: { top: gameplayTop, height: gameplayHeight },
    captions: { top: 0, height: input.height },
    resolvedContentPosition,
    resolvedGameplayPosition,
    isContentFull,
    isGameplayFull,
    contentOnTop,
  };
}
