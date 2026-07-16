import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';

const TransitionOperationSchema = z.enum([
  'reveal',
  'compress',
  'expand',
  'reframe',
  'compare',
  'state_change',
  'match_cut',
]);

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/iu);

const SilentFormatIdSchema = z.enum([
  'product-screen-demo',
  'ui-native-thread-reveal',
  'motion-card-lesson',
]);

const ExactBindingSchema = z
  .object({
    role: z.enum(['canonical_packet', 'content_pack', 'redcow_assessment', 'format_registry']),
    ref: z.string().min(1),
    id: z.string().min(1),
    sha256: Sha256Schema,
  })
  .strict();

const ProofTensionCueSchema = z
  .object({
    proofStatement: z.string().min(1),
    tensionStatement: z.string().min(1),
    sourceRef: z.string().min(1),
  })
  .strict();

const FirstFrameSchema = z
  .object({
    concreteObject: z.string().min(1),
    primaryText: z.string().min(1),
    proofSourceRef: z.string().min(1),
    visualHierarchy: z.array(z.string().min(1)).min(2).max(4),
    mobileLegibility: z.enum(['pass', 'unknown']),
  })
  .strict();

const TransitionTreatmentSchema = z
  .object({
    id: z.string().min(1),
    fromBeatId: z.string().min(1),
    toBeatId: z.string().min(1),
    operation: TransitionOperationSchema,
    preservedObject: z.string().min(1),
    stateChange: z.string().min(1),
    viewerModelDelta: z.string().min(1),
    visualTreatment: z.string().min(1),
    decorativeOnly: z.literal(false),
    providerCallRequired: z.literal(false),
  })
  .strict();

const FormatRegistryBindingSchema = ExactBindingSchema.omit({ role: true }).extend({
  formatId: SilentFormatIdSchema,
});

const SilentCompilerBindingSchema = z
  .object({
    registry_ref: z.string().min(1),
    registry_sha256: Sha256Schema,
    format_id: SilentFormatIdSchema,
    audio_mode: z.literal('non_voice'),
    phase_scaling: z.literal('deterministic_to_target_duration'),
    caption_timing_source: z.literal('exact_beat_start_end_seconds'),
    primary_carrier_focal_regions: z.literal(1),
    owned_or_local_assets_only: z.literal(true),
    silent_wav_carrier_required: z.literal(true),
    disabled_checks: z.array(z.string().min(1)).min(1),
    preserved_gates: z.array(z.string().min(1)).min(1),
    reject_conditions: z.array(z.string().min(1)).min(1),
  })
  .passthrough();

const SilentPacketSchema = z
  .object({
    status: z.string().min(1),
    chain_role: z.string().min(1),
    video_id: z.string().min(1),
    content_pack_binding: z
      .object({
        content_pack_id: z.string().min(1),
        content_pack_ref: z.string().min(1),
        content_pack_sha256: Sha256Schema,
      })
      .passthrough(),
    redcow_binding: z
      .object({
        status: z.string().min(1),
        redcow_assessment_ref: z.string().min(1).nullable(),
        redcow_assessment_sha256: Sha256Schema.nullable(),
      })
      .passthrough(),
    silent_compiler_binding: SilentCompilerBindingSchema,
    beats: z
      .array(
        z
          .object({
            id: z.string().min(1),
            start_seconds: z.number().nonnegative(),
            end_seconds: z.number().positive(),
            on_screen_text: z.string().min(1),
          })
          .passthrough()
      )
      .length(5),
    audio: z
      .object({
        voice: z.literal('none'),
        music_source_ref: z.null(),
        natural_sound_plan: z.literal('none'),
        sfx_plan: z.literal('none'),
      })
      .passthrough(),
    generation: z
      .object({
        enabled: z.literal(false),
        quoted_cost_usd: z.literal(0),
        hard_cost_cap_usd: z.literal(0),
      })
      .passthrough(),
    edit_contract: z
      .object({
        target_duration_seconds: z.number().min(10).max(20),
        duration_policy: z.literal('preserve'),
      })
      .passthrough(),
  })
  .passthrough();

const SilentFormatRegistrySchema = z
  .object({
    schema_version: z.string().min(1),
    shared: z
      .object({
        duration_seconds: z.object({ minimum: z.literal(10), maximum: z.literal(20) }),
        audio: z.literal('absent'),
        captions: z.literal('large_exact_timing_required'),
        focal_regions: z.literal(1),
        allowed_rights_basis: z.array(z.string()).min(1),
        allowed_provider: z.array(z.string()).min(1),
        forbidden_media: z.array(z.string()).min(1),
        hard_gates_preserved: z.array(z.string()).min(1),
      })
      .passthrough(),
    adapters: z.record(
      SilentFormatIdSchema,
      z
        .object({
          phases: z.array(
            z.object({
              id: z.string().min(1),
              start_seconds: z.number().nonnegative(),
              end_seconds: z.number().positive(),
            })
          ),
          reject: z.array(z.string().min(1)).min(1),
        })
        .passthrough()
    ),
  })
  .passthrough();

const SilentFastLaneTreatmentSchema = z
  .object({
    formatId: SilentFormatIdSchema,
    chainDisposition: z.enum(['structural_reference_only', 'production_final']),
    audioMode: z.literal('non_voice'),
    targetDurationSeconds: z.number().min(10).max(20),
    captionTimingSource: z.literal('exact_beat_start_end_seconds'),
    focalRegionCount: z.literal(1),
    ownedOrLocalAssetsOnly: z.literal(true),
    rejectConditions: z.array(z.string().min(1)).min(1),
    disabledChecks: z.array(z.string().min(1)).min(1),
    preservedGates: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const OpeningPackageRequestSchema = z
  .object({
    canonicalPacketRef: z.string().min(1),
    canonicalPacketId: z.string().min(1),
    canonicalPacketSha256: Sha256Schema,
    contentPackBinding: ExactBindingSchema.omit({ role: true }),
    redcowBinding: ExactBindingSchema.omit({ role: true }),
    outputPath: z.string().min(1).default('output/content-machine/packaging/opening-package.json'),
    hookMode: z.enum(['spoken', 'on_screen_only']).default('spoken'),
    spokenHook: z.string(),
    onScreenPromise: z.string().min(1),
    firstFrame: FirstFrameSchema,
    proofTensionCue: ProofTensionCueSchema,
    promiseAlignment: z
      .object({
        promiseToPay: z.string().min(1),
        payoffBeatId: z.string().min(1),
        bodyPaysExactPromise: z.literal(true),
      })
      .strict(),
    transitions: z.array(TransitionTreatmentSchema).min(1).max(8),
    durationPolicy: z.literal('preserve').default('preserve'),
    thirdPartyCreatorAssetsUsed: z.literal(false),
    copiedCreatorWordingUsed: z.literal(false),
    providerCallsAllowed: z.literal(false),
    formatRegistryBinding: FormatRegistryBindingSchema.optional(),
    chainDisposition: z
      .enum(['structural_reference_only', 'production_final'])
      .default('production_final'),
  })
  .strict()
  .superRefine((request, context) => {
    if (request.hookMode === 'spoken' && request.spokenHook.trim().length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['spokenHook'],
        message: 'Spoken packages require a spoken hook',
      });
    }
    if (request.hookMode === 'on_screen_only' && request.spokenHook.length !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['spokenHook'],
        message: 'Silent packages must use an empty spoken hook',
      });
    }
    if (request.hookMode === 'on_screen_only' && !request.formatRegistryBinding) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['formatRegistryBinding'],
        message: 'Silent packages require an exact format-registry binding',
      });
    }
    if (request.hookMode === 'spoken' && request.formatRegistryBinding) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['formatRegistryBinding'],
        message: 'Format-registry binding is reserved for silent fast-lane packages',
      });
    }
  });

export type OpeningPackageRequest = z.input<typeof OpeningPackageRequestSchema>;

const ValidationCheckSchema = z
  .object({
    id: z.string().min(1),
    passed: z.boolean(),
    detail: z.string().min(1),
  })
  .strict();

export const OpeningPackageOutputSchema = z
  .object({
    schemaVersion: z.literal(1),
    canonicalPacketRef: z.string().min(1),
    canonicalPacketId: z.string().min(1),
    hookMode: z.enum(['spoken', 'on_screen_only']).default('spoken'),
    spokenHook: z.string(),
    firstFrame: FirstFrameSchema,
    onScreenPromise: z.string().min(1),
    proofTensionCue: ProofTensionCueSchema,
    firstTransition: TransitionTreatmentSchema,
    transitionTreatments: z.array(TransitionTreatmentSchema).min(1),
    silentFastLaneTreatment: SilentFastLaneTreatmentSchema.optional(),
    validation: z
      .object({
        passed: z.literal(true),
        durationPolicy: z.literal('preserve'),
        promiseToPay: z.string().min(1),
        payoffBeatId: z.string().min(1),
        bindings: z.array(ExactBindingSchema).min(3).max(4),
        checks: z.array(ValidationCheckSchema).min(1),
      })
      .strict(),
    exclusions: z.array(z.string().min(1)).min(1),
  })
  .strict();

export type OpeningPackageOutput = z.infer<typeof OpeningPackageOutputSchema>;

function wordCount(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function collectPacketRefs(value: unknown, refs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectPacketRefs(item, refs);
    return;
  }

  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (
      typeof child === 'string' &&
      ['ref', 'sourceRef', 'source_ref', 'exact_url_or_redacted_path'].includes(key)
    ) {
      refs.add(child);
    }
    collectPacketRefs(child, refs);
  }
}

async function readCanonicalPacket(path: string): Promise<unknown> {
  const raw = await readFile(path, 'utf8');
  return extname(path).toLowerCase() === '.json' ? JSON.parse(raw) : parseYaml(raw);
}

async function sha256File(path: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

function packagingError(message: string, details: unknown): Error {
  const error = new Error(message) as Error & { code: string; details: unknown };
  error.code = 'PACKAGING_VALIDATION_FAILED';
  error.details = details;
  return error;
}

function sameStringSet(actual: string[], expected: string[]): boolean {
  return (
    actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index])
  );
}

function hasContiguousExactCaptionTiming(
  beats: z.infer<typeof SilentPacketSchema>['beats'],
  targetDurationSeconds: number
): boolean {
  if (beats[0]?.start_seconds !== 0) return false;
  if (beats.at(-1)?.end_seconds !== targetDurationSeconds) return false;
  return beats.every(
    (beat, index) =>
      beat.end_seconds > beat.start_seconds &&
      (index === 0 || beats[index - 1]?.end_seconds === beat.start_seconds)
  );
}

/** Validate and write the packaging-only opening slice for one canonical packet. */
export async function buildOpeningPackage(
  request: OpeningPackageRequest
): Promise<
  HarnessToolResult<{ outputPath: string; canonicalPacketId: string; checkCount: number }>
> {
  const normalized = OpeningPackageRequestSchema.parse(request);
  const canonicalPacketPath = resolve(normalized.canonicalPacketRef);
  const contentPackPath = resolve(normalized.contentPackBinding.ref);
  const redcowPath = resolve(normalized.redcowBinding.ref);
  const formatRegistryPath = normalized.formatRegistryBinding
    ? resolve(normalized.formatRegistryBinding.ref)
    : null;
  const outputPath = resolve(normalized.outputPath);
  const canonicalPacket = await readCanonicalPacket(canonicalPacketPath);
  const [canonicalPacketSha256, contentPackSha256, redcowSha256] = await Promise.all([
    sha256File(canonicalPacketPath),
    sha256File(contentPackPath),
    sha256File(redcowPath),
  ]);
  const formatRegistrySha256 = formatRegistryPath ? await sha256File(formatRegistryPath) : null;
  const silentPacketResult = normalized.formatRegistryBinding
    ? SilentPacketSchema.safeParse(canonicalPacket)
    : null;
  const formatRegistryResult = formatRegistryPath
    ? SilentFormatRegistrySchema.safeParse(await readCanonicalPacket(formatRegistryPath))
    : null;
  const silentPacket = silentPacketResult?.success ? silentPacketResult.data : null;
  const formatRegistry = formatRegistryResult?.success ? formatRegistryResult.data : null;
  const selectedAdapter =
    formatRegistry && normalized.formatRegistryBinding
      ? formatRegistry.adapters[normalized.formatRegistryBinding.formatId]
      : null;
  const packetRefs = new Set<string>();
  collectPacketRefs(canonicalPacket, packetRefs);

  const transitionContinuity = normalized.transitions.every(
    (transition, index) =>
      index === 0 || normalized.transitions[index - 1]?.toBeatId === transition.fromBeatId
  );
  const payoffReached = normalized.transitions.some(
    (transition) => transition.toBeatId === normalized.promiseAlignment.payoffBeatId
  );

  const silentChecks = normalized.formatRegistryBinding
    ? [
        {
          id: 'format_registry_hash_matches',
          passed: formatRegistrySha256 === normalized.formatRegistryBinding.sha256.toLowerCase(),
          detail: `Format-registry hash must match ${normalized.formatRegistryBinding.sha256.toLowerCase()}.`,
        },
        {
          id: 'silent_packet_contract_parses',
          passed: silentPacketResult?.success === true,
          detail:
            'Silent packet must expose the exact compiler, five-beat timing, audio, generation, and chain-binding contract.',
        },
        {
          id: 'format_registry_contract_parses',
          passed: formatRegistryResult?.success === true,
          detail:
            'Format registry must expose the supported adapters and shared silent fast-lane policy.',
        },
        {
          id: 'silent_packet_id_matches',
          passed: silentPacket?.video_id === normalized.canonicalPacketId,
          detail: 'Canonical packet id must equal the packet video_id.',
        },
        {
          id: 'content_pack_bound_by_packet',
          passed:
            silentPacket?.content_pack_binding.content_pack_ref ===
              normalized.contentPackBinding.ref &&
            silentPacket?.content_pack_binding.content_pack_id ===
              normalized.contentPackBinding.id &&
            silentPacket?.content_pack_binding.content_pack_sha256.toLowerCase() ===
              normalized.contentPackBinding.sha256.toLowerCase(),
          detail:
            'Silent packet must bind the same exact content-pack ref, id, and hash as Packaging.',
        },
        {
          id: 'redcow_bound_by_packet',
          passed:
            normalized.chainDisposition === 'structural_reference_only' ||
            (silentPacket?.redcow_binding.redcow_assessment_ref === normalized.redcowBinding.ref &&
              silentPacket?.redcow_binding.redcow_assessment_sha256?.toLowerCase() ===
                normalized.redcowBinding.sha256.toLowerCase()),
          detail:
            'Production-final Packaging must use the exact REDCOW ref and hash embedded by Editorial.',
        },
        {
          id: 'production_final_packet_declared',
          passed:
            normalized.chainDisposition === 'structural_reference_only' ||
            (silentPacket !== null &&
              !silentPacket.status.includes('pending') &&
              !silentPacket.chain_role.includes('not_production_final') &&
              silentPacket.redcow_binding.redcow_assessment_ref !== null &&
              silentPacket.redcow_binding.redcow_assessment_sha256 !== null),
          detail:
            'Production-final output is forbidden for pending or assessment-input-only packets.',
        },
        {
          id: 'packet_registry_binding_matches',
          passed:
            silentPacket?.silent_compiler_binding.registry_ref ===
              normalized.formatRegistryBinding.ref &&
            silentPacket?.silent_compiler_binding.registry_sha256.toLowerCase() ===
              normalized.formatRegistryBinding.sha256.toLowerCase() &&
            silentPacket?.silent_compiler_binding.format_id ===
              normalized.formatRegistryBinding.formatId,
          detail: 'Packet must select the exact Packaging format from the exact registry bytes.',
        },
        {
          id: 'non_voice_audio_contract',
          passed:
            normalized.hookMode === 'on_screen_only' &&
            normalized.spokenHook.length === 0 &&
            silentPacket?.silent_compiler_binding.audio_mode === 'non_voice' &&
            silentPacket?.audio.voice === 'none' &&
            silentPacket?.audio.music_source_ref === null &&
            silentPacket?.audio.natural_sound_plan === 'none' &&
            silentPacket?.audio.sfx_plan === 'none',
          detail:
            'Silent fast-lane treatment must contain no spoken hook, voice, music, SFX, or natural sound.',
        },
        {
          id: 'zero_provider_generation_or_spend',
          passed:
            silentPacket?.generation.enabled === false &&
            silentPacket?.generation.quoted_cost_usd === 0 &&
            silentPacket?.generation.hard_cost_cap_usd === 0,
          detail: 'Provider generation and spend must remain disabled.',
        },
        {
          id: 'duration_and_caption_timing_exact',
          passed:
            silentPacket !== null &&
            hasContiguousExactCaptionTiming(
              silentPacket.beats,
              silentPacket.edit_contract.target_duration_seconds
            ),
          detail:
            'Five captioned beats must be contiguous from 0.0 through the exact 10-20s target.',
        },
        {
          id: 'one_owned_local_focal_carrier',
          passed:
            silentPacket?.silent_compiler_binding.primary_carrier_focal_regions === 1 &&
            silentPacket?.silent_compiler_binding.owned_or_local_assets_only === true,
          detail: 'Treatment must use one focal primary carrier and owned/local assets only.',
        },
        {
          id: 'format_reject_conditions_match',
          passed:
            selectedAdapter !== null &&
            silentPacket !== null &&
            sameStringSet(
              silentPacket.silent_compiler_binding.reject_conditions,
              selectedAdapter.reject
            ),
          detail: 'Packet reject conditions must exactly match the selected registry adapter.',
        },
        {
          id: 'only_audio_signal_checks_disabled',
          passed:
            silentPacket !== null &&
            sameStringSet(silentPacket.silent_compiler_binding.disabled_checks, [
              'speech_signal_only',
              'audio_signal_only',
            ]),
          detail: 'Only speech-signal and audio-signal checks may be disabled.',
        },
        {
          id: 'downstream_gates_preserved',
          passed:
            silentPacket !== null &&
            ['visual', 'rights', 'identity', 'exact_render', 'independent_qa'].every((gate) =>
              silentPacket.silent_compiler_binding.preserved_gates.includes(gate)
            ),
          detail:
            'Visual, rights, identity, exact-render, and independent-QA gates must remain enabled.',
        },
      ]
    : [];

  const checks = [
    {
      id: 'canonical_packet_hash_matches',
      passed: canonicalPacketSha256 === normalized.canonicalPacketSha256.toLowerCase(),
      detail: `Canonical packet hash must match ${normalized.canonicalPacketSha256.toLowerCase()}.`,
    },
    {
      id: 'content_pack_hash_matches',
      passed: contentPackSha256 === normalized.contentPackBinding.sha256.toLowerCase(),
      detail: `Content-pack hash must match ${normalized.contentPackBinding.sha256.toLowerCase()}.`,
    },
    {
      id: 'redcow_hash_matches',
      passed: redcowSha256 === normalized.redcowBinding.sha256.toLowerCase(),
      detail: `REDCOW assessment hash must match ${normalized.redcowBinding.sha256.toLowerCase()}.`,
    },
    {
      id: 'spoken_hook_concise',
      passed: wordCount(normalized.spokenHook) <= 16,
      detail: `Spoken hook contains ${wordCount(normalized.spokenHook)} words; maximum is 16.`,
    },
    {
      id: 'first_frame_text_concise',
      passed: wordCount(normalized.firstFrame.primaryText) <= 9,
      detail: `First-frame text contains ${wordCount(normalized.firstFrame.primaryText)} words; maximum is 9.`,
    },
    {
      id: 'opening_promise_concise',
      passed: wordCount(normalized.onScreenPromise) <= 12,
      detail: `On-screen promise contains ${wordCount(normalized.onScreenPromise)} words; maximum is 12.`,
    },
    {
      id: 'first_frame_proof_bound_to_packet',
      passed: packetRefs.has(normalized.firstFrame.proofSourceRef),
      detail: `First-frame proof source must be present in canonical packet ${normalized.canonicalPacketId}.`,
    },
    {
      id: 'tension_proof_bound_to_packet',
      passed: packetRefs.has(normalized.proofTensionCue.sourceRef),
      detail: `Proof/tension source must be present in canonical packet ${normalized.canonicalPacketId}.`,
    },
    {
      id: 'transition_chain_continuous',
      passed: transitionContinuity,
      detail: "Each transition must start from the prior transition's destination beat.",
    },
    {
      id: 'payoff_reached',
      passed: payoffReached,
      detail: `The transition chain must reach payoff beat ${normalized.promiseAlignment.payoffBeatId}.`,
    },
    {
      id: 'semantic_transitions_only',
      passed: normalized.transitions.every(
        (transition) => !transition.decorativeOnly && !transition.providerCallRequired
      ),
      detail: 'Every transition must change meaning while requiring no provider call.',
    },
    {
      id: 'mobile_legibility_declared',
      passed: ['pass', 'unknown'].includes(normalized.firstFrame.mobileLegibility),
      detail:
        'Mobile legibility must stay explicit; unknown is valid before an exact render exists.',
    },
    ...silentChecks,
  ];

  const failed = checks.filter((check) => !check.passed);
  if (failed.length > 0) {
    throw packagingError('Opening package failed validation', { failed });
  }

  const output = OpeningPackageOutputSchema.parse({
    schemaVersion: 1,
    canonicalPacketRef: normalized.canonicalPacketRef,
    canonicalPacketId: normalized.canonicalPacketId,
    hookMode: normalized.hookMode,
    spokenHook: normalized.spokenHook,
    firstFrame: normalized.firstFrame,
    onScreenPromise: normalized.onScreenPromise,
    proofTensionCue: normalized.proofTensionCue,
    firstTransition: normalized.transitions[0],
    transitionTreatments: normalized.transitions,
    silentFastLaneTreatment:
      normalized.formatRegistryBinding && silentPacket
        ? {
            formatId: normalized.formatRegistryBinding.formatId,
            chainDisposition: normalized.chainDisposition,
            audioMode: silentPacket.silent_compiler_binding.audio_mode,
            targetDurationSeconds: silentPacket.edit_contract.target_duration_seconds,
            captionTimingSource: silentPacket.silent_compiler_binding.caption_timing_source,
            focalRegionCount: silentPacket.silent_compiler_binding.primary_carrier_focal_regions,
            ownedOrLocalAssetsOnly: silentPacket.silent_compiler_binding.owned_or_local_assets_only,
            rejectConditions: silentPacket.silent_compiler_binding.reject_conditions,
            disabledChecks: silentPacket.silent_compiler_binding.disabled_checks,
            preservedGates: silentPacket.silent_compiler_binding.preserved_gates,
          }
        : undefined,
    validation: {
      passed: true,
      durationPolicy: normalized.durationPolicy,
      promiseToPay: normalized.promiseAlignment.promiseToPay,
      payoffBeatId: normalized.promiseAlignment.payoffBeatId,
      bindings: [
        {
          role: 'canonical_packet',
          ref: normalized.canonicalPacketRef,
          id: normalized.canonicalPacketId,
          sha256: canonicalPacketSha256,
        },
        {
          role: 'content_pack',
          ...normalized.contentPackBinding,
          sha256: contentPackSha256,
        },
        {
          role: 'redcow_assessment',
          ...normalized.redcowBinding,
          sha256: redcowSha256,
        },
        ...(normalized.formatRegistryBinding && formatRegistrySha256
          ? [
              {
                role: 'format_registry' as const,
                ref: normalized.formatRegistryBinding.ref,
                id: normalized.formatRegistryBinding.id,
                sha256: formatRegistrySha256,
              },
            ]
          : []),
      ],
      checks,
    },
    exclusions: [
      'no_full_script_or_canonical_packet_rewrite',
      'no_archetype_or_source_library_ownership',
      'no_attention_or_retention_probability_modeling',
      'no_provider_calls_prompts_execution_or_spend',
      'no_whole_video_rendering',
      'no_silent_wav_or_media_materialization',
      'no_analytics_publish_or_account_actions',
      'no_third_party_creator_assets_or_copied_wording',
    ],
  });

  await writeJsonArtifact(outputPath, output);

  return {
    result: {
      outputPath,
      canonicalPacketId: normalized.canonicalPacketId,
      checkCount: checks.length,
    },
    artifacts: [artifactFile(outputPath, 'Validated packaging-only opening artifact')],
  };
}
