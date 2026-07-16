import { z } from 'zod';

const PhaseSchema = z
  .object({
    id: z.string().min(1),
    startSeconds: z.number().nonnegative(),
    endSeconds: z.number().positive(),
    viewerJob: z.string().min(1),
    visualRule: z.string().min(1),
    captionRule: z.string().min(1),
  })
  .strict()
  .refine((phase) => phase.endSeconds > phase.startSeconds, {
    message: 'Phase end must be after phase start',
  });

const TransitionGrammarSchema = z
  .object({
    id: z.string().min(1),
    fromPhaseId: z.string().min(1),
    toPhaseId: z.string().min(1),
    operation: z.enum(['reveal', 'compare', 'reframe', 'compress', 'state_change']),
    preservedObjectRule: z.string().min(1),
    semanticChangeRule: z.string().min(1),
    decorativeOnly: z.literal(false),
    providerCallRequired: z.literal(false),
  })
  .strict();

export const SilentFastLanePresetSchema = z
  .object({
    id: z.enum(['product-screen-demo', 'ui-native-thread-reveal', 'motion-card-lesson']),
    durationRangeSeconds: z
      .object({ min: z.literal(10), max: z.literal(20), policy: z.literal('preserve') })
      .strict(),
    openingTreatment: z
      .object({
        focalObjectRule: z.string().min(1),
        onScreenPromiseRule: z.string().min(1),
        proofOrTensionCueRule: z.string().min(1),
        firstFrameMustBeObservable: z.literal(true),
      })
      .strict(),
    phases: z.array(PhaseSchema).length(4),
    transitionGrammar: z.array(TransitionGrammarSchema).length(3),
    assetPolicy: z
      .object({
        allowed: z.array(z.string().min(1)).min(1),
        rejected: z.array(z.string().min(1)).min(1),
        ownedOrCodeNativeOnly: z.literal(true),
      })
      .strict(),
    silentPolicy: z
      .object({
        meaningSurvivesWithoutAudio: z.literal(true),
        voiceAllowed: z.literal(false),
        sfxAllowed: z.literal(false),
        musicAllowed: z.literal(false),
      })
      .strict(),
    providerPolicy: z
      .object({
        stockAllowed: z.literal(false),
        thirdPartyAssetsAllowed: z.literal(false),
        generatedProviderAssetsAllowed: z.literal(false),
        providerCallsAllowed: z.literal(false),
      })
      .strict(),
    framePolicy: z
      .object({
        focalRegionCount: z.literal(1),
        captions: z.literal('large'),
        mobileLegibilityRequired: z.literal(true),
      })
      .strict(),
    thesisOwnership: z.literal('editorial_only'),
  })
  .strict()
  .superRefine((preset, context) => {
    for (let index = 1; index < preset.phases.length; index += 1) {
      if (preset.phases[index - 1]?.endSeconds !== preset.phases[index]?.startSeconds) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phases', index],
          message: 'Fast-lane phases must be contiguous',
        });
      }
    }

    for (let index = 0; index < preset.transitionGrammar.length; index += 1) {
      const transition = preset.transitionGrammar[index];
      if (
        transition?.fromPhaseId !== preset.phases[index]?.id ||
        transition?.toPhaseId !== preset.phases[index + 1]?.id
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transitionGrammar', index],
          message: 'Transition must connect adjacent canonical phases',
        });
      }
    }
  });

export type SilentFastLanePreset = z.infer<typeof SilentFastLanePresetSchema>;

const presets = SilentFastLanePresetSchema.array()
  .length(3)
  .parse([
    {
      id: 'product-screen-demo',
      durationRangeSeconds: { min: 10, max: 20, policy: 'preserve' },
      openingTreatment: {
        focalObjectRule:
          'Open directly on the owned product or UI result with its observable state already legible.',
        onScreenPromiseRule: 'Name the exact visible result without claiming an unshown benefit.',
        proofOrTensionCueRule:
          'The initial state must create a concrete before-or-after question that the following actions resolve.',
        firstFrameMustBeObservable: true,
      },
      phases: [
        {
          id: 'result-first-screen',
          startSeconds: 0,
          endSeconds: 2,
          viewerJob: 'recognize_result',
          visualRule:
            'Show one owned product or UI result with no logo intro, mock, or decorative wrapper.',
          captionRule: 'Use one large result claim in the same focal region as the changed state.',
        },
        {
          id: 'captioned-actions',
          startSeconds: 2,
          endSeconds: 9,
          viewerJob: 'follow_actions',
          visualRule:
            'Show only one or two owned, observable actions that produce the promised state change.',
          captionRule: 'One short action label at a time; do not narrate hidden logic.',
        },
        {
          id: 'proof-crop',
          startSeconds: 9,
          endSeconds: 15,
          viewerJob: 'verify_result',
          visualRule:
            'Crop tightly to the exact changed UI state, result, or receipt that proves the claim.',
          captionRule: 'Label what changed and nothing broader than the visible evidence.',
        },
        {
          id: 'takeaway',
          startSeconds: 15,
          endSeconds: 20,
          viewerJob: 'carry_decision',
          visualRule:
            'Keep the proof visible while adding one compact application or decision rule.',
          captionRule: 'Make the takeaway screenshotable without replacing the proof object.',
        },
      ],
      transitionGrammar: [
        {
          id: 'result-to-actions',
          fromPhaseId: 'result-first-screen',
          toPhaseId: 'captioned-actions',
          operation: 'reframe',
          preservedObjectRule: 'Keep the same product surface and focal state visible.',
          semanticChangeRule:
            'Move from result recognition to the minimum observable actions that caused it.',
          decorativeOnly: false,
          providerCallRequired: false,
        },
        {
          id: 'actions-to-proof',
          fromPhaseId: 'captioned-actions',
          toPhaseId: 'proof-crop',
          operation: 'compare',
          preservedObjectRule:
            'Preserve the changed control or state produced by the final action.',
          semanticChangeRule:
            'Tighten attention from operation to the exact evidence that verifies the result.',
          decorativeOnly: false,
          providerCallRequired: false,
        },
        {
          id: 'proof-to-takeaway',
          fromPhaseId: 'proof-crop',
          toPhaseId: 'takeaway',
          operation: 'reframe',
          preservedObjectRule: 'Keep the proof crop visible as the takeaway appears.',
          semanticChangeRule: 'Convert the observed result into one bounded reusable decision.',
          decorativeOnly: false,
          providerCallRequired: false,
        },
      ],
      assetPolicy: {
        allowed: [
          'owned product capture',
          'owned UI capture',
          'code-native cursor or highlight',
          'large captions',
        ],
        rejected: [
          'mocks',
          'private or unredactable data',
          'unobservable claims',
          'decorative UI replacement',
        ],
        ownedOrCodeNativeOnly: true,
      },
      silentPolicy: {
        meaningSurvivesWithoutAudio: true,
        voiceAllowed: false,
        sfxAllowed: false,
        musicAllowed: false,
      },
      providerPolicy: {
        stockAllowed: false,
        thirdPartyAssetsAllowed: false,
        generatedProviderAssetsAllowed: false,
        providerCallsAllowed: false,
      },
      framePolicy: { focalRegionCount: 1, captions: 'large', mobileLegibilityRequired: true },
      thesisOwnership: 'editorial_only',
    },
    {
      id: 'ui-native-thread-reveal',
      durationRangeSeconds: { min: 10, max: 20, policy: 'preserve' },
      openingTreatment: {
        focalObjectRule: 'Open on one owned or clean-room reconstructed generic UI question card.',
        onScreenPromiseRule: 'State the exact question that the two subsequent reveals answer.',
        proofOrTensionCueRule:
          'The question must expose a real decision gap without implying a private message or copied interface.',
        firstFrameMustBeObservable: true,
      },
      phases: [
        {
          id: 'question-card',
          startSeconds: 0,
          endSeconds: 3,
          viewerJob: 'form_question',
          visualRule: 'Show one question inside an owned or generic reconstructed UI shell.',
          captionRule: 'Use the question itself as the large caption; no secondary setup.',
        },
        {
          id: 'decisive-reveals',
          startSeconds: 3,
          endSeconds: 10,
          viewerJob: 'update_belief',
          visualRule:
            'Reveal exactly two decisive owned facts or state changes in the same UI sequence.',
          captionRule:
            'One concise interpretation per reveal; keep both tied to the opening question.',
        },
        {
          id: 'receipt-hold',
          startSeconds: 10,
          endSeconds: 15,
          viewerJob: 'verify_answer',
          visualRule: 'Hold the exact owned or reconstructed receipt that resolves the question.',
          captionRule:
            'Label the receipt and its bounded implication without adding an unshown claim.',
        },
        {
          id: 'meaning-card',
          startSeconds: 15,
          endSeconds: 20,
          viewerJob: 'carry_meaning',
          visualRule: 'Preserve the receipt while reframing it into one compact meaning card.',
          captionRule:
            'State one useful conclusion; do not imitate a social post or message thread.',
        },
      ],
      transitionGrammar: [
        {
          id: 'question-to-reveals',
          fromPhaseId: 'question-card',
          toPhaseId: 'decisive-reveals',
          operation: 'reveal',
          preservedObjectRule:
            'Keep the opening question anchored while each answer state appears.',
          semanticChangeRule:
            'Move from unresolved decision to two evidence-backed belief updates.',
          decorativeOnly: false,
          providerCallRequired: false,
        },
        {
          id: 'reveals-to-receipt',
          fromPhaseId: 'decisive-reveals',
          toPhaseId: 'receipt-hold',
          operation: 'compress',
          preservedObjectRule:
            'Preserve the decisive states while collapsing them into their exact receipt.',
          semanticChangeRule:
            'Move from sequential clues to the single object that verifies the answer.',
          decorativeOnly: false,
          providerCallRequired: false,
        },
        {
          id: 'receipt-to-meaning',
          fromPhaseId: 'receipt-hold',
          toPhaseId: 'meaning-card',
          operation: 'reframe',
          preservedObjectRule: 'Keep the receipt visible behind or beside the meaning card.',
          semanticChangeRule:
            'Convert the verified answer into one bounded reusable interpretation.',
          decorativeOnly: false,
          providerCallRequired: false,
        },
      ],
      assetPolicy: {
        allowed: [
          'owned UI sequence',
          'clean-room generic UI reconstruction',
          'owned receipt',
          'large captions',
        ],
        rejected: [
          'copied trade dress',
          'unpermitted private messages',
          'identifiable third-party data',
          'fake receipts',
        ],
        ownedOrCodeNativeOnly: true,
      },
      silentPolicy: {
        meaningSurvivesWithoutAudio: true,
        voiceAllowed: false,
        sfxAllowed: false,
        musicAllowed: false,
      },
      providerPolicy: {
        stockAllowed: false,
        thirdPartyAssetsAllowed: false,
        generatedProviderAssetsAllowed: false,
        providerCallsAllowed: false,
      },
      framePolicy: { focalRegionCount: 1, captions: 'large', mobileLegibilityRequired: true },
      thesisOwnership: 'editorial_only',
    },
    {
      id: 'motion-card-lesson',
      durationRangeSeconds: { min: 10, max: 20, policy: 'preserve' },
      openingTreatment: {
        focalObjectRule:
          'Open on one deterministic relationship pattern built from two or three persistent objects.',
        onScreenPromiseRule: 'Name the relationship or consequence the objects will demonstrate.',
        proofOrTensionCueRule:
          'The pattern must expose a causal question and remain anchored to real proof elsewhere in the packet.',
        firstFrameMustBeObservable: true,
      },
      phases: [
        {
          id: 'pattern',
          startSeconds: 0,
          endSeconds: 3,
          viewerJob: 'recognize_pattern',
          visualRule: 'Show the complete initial relationship with no decorative scene-setting.',
          captionRule:
            'One large pattern label; typography supports the objects rather than replacing them.',
        },
        {
          id: 'persistent-objects',
          startSeconds: 3,
          endSeconds: 9,
          viewerJob: 'track_relationship',
          visualRule:
            'Use only two or three persistent objects and preserve their identities and positions.',
          captionRule: 'Label each object once, then use short relationship captions.',
        },
        {
          id: 'causal-transformation',
          startSeconds: 9,
          endSeconds: 15,
          viewerJob: 'understand_cause',
          visualRule: 'Apply exactly one causal transformation to the same persistent objects.',
          captionRule: 'State the cause before the consequence; do not add a second mechanism.',
        },
        {
          id: 'carry-card',
          startSeconds: 15,
          endSeconds: 20,
          viewerJob: 'carry_model',
          visualRule:
            'Compress the final relationship into a screenshotable carry card while keeping the proof pointer visible.',
          captionRule: 'Use one compact rule that can be applied without the creator brand.',
        },
      ],
      transitionGrammar: [
        {
          id: 'pattern-to-objects',
          fromPhaseId: 'pattern',
          toPhaseId: 'persistent-objects',
          operation: 'reveal',
          preservedObjectRule:
            'Keep the initial pattern fixed while object labels and roles become explicit.',
          semanticChangeRule: 'Move from pattern recognition to a trackable relationship model.',
          decorativeOnly: false,
          providerCallRequired: false,
        },
        {
          id: 'objects-to-cause',
          fromPhaseId: 'persistent-objects',
          toPhaseId: 'causal-transformation',
          operation: 'state_change',
          preservedObjectRule:
            'Use the same two or three objects with no substitution or identity drift.',
          semanticChangeRule:
            'Change exactly one relationship so the viewer can attribute the consequence to one cause.',
          decorativeOnly: false,
          providerCallRequired: false,
        },
        {
          id: 'cause-to-carry',
          fromPhaseId: 'causal-transformation',
          toPhaseId: 'carry-card',
          operation: 'compress',
          preservedObjectRule: 'Keep the final causal relationship and proof pointer visible.',
          semanticChangeRule: 'Compress the demonstrated mechanism into one transferable rule.',
          decorativeOnly: false,
          providerCallRequired: false,
        },
      ],
      assetPolicy: {
        allowed: [
          'deterministic local 2D objects',
          'code-native diagrams',
          'owned proof pointers',
          'large captions',
        ],
        rejected: [
          'typography-only work',
          'graphics that hide real proof',
          'decorative 3D',
          'provider-generated media',
        ],
        ownedOrCodeNativeOnly: true,
      },
      silentPolicy: {
        meaningSurvivesWithoutAudio: true,
        voiceAllowed: false,
        sfxAllowed: false,
        musicAllowed: false,
      },
      providerPolicy: {
        stockAllowed: false,
        thirdPartyAssetsAllowed: false,
        generatedProviderAssetsAllowed: false,
        providerCallsAllowed: false,
      },
      framePolicy: { focalRegionCount: 1, captions: 'large', mobileLegibilityRequired: true },
      thesisOwnership: 'editorial_only',
    },
  ]);

/** List the thesis-neutral silent fast-lane packaging presets. */
export function listSilentFastLanePresets(): SilentFastLanePreset[] {
  return presets.map((preset) => structuredClone(preset));
}

/** Resolve one silent fast-lane packaging preset by exact id. */
export function getSilentFastLanePreset(id: SilentFastLanePreset['id']): SilentFastLanePreset {
  const preset = presets.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Unknown silent fast-lane preset: ${id}`);
  return structuredClone(preset);
}
