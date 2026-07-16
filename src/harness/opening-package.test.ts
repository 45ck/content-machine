import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildOpeningPackage, OpeningPackageOutputSchema } from './opening-package';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-opening-package-'));
  tempDirs.push(dir);
  return dir;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function validRequest(
  packetPath: string,
  packetRaw: string,
  contentPackPath: string,
  contentPackRaw: string,
  redcowPath: string,
  redcowRaw: string,
  outputPath: string
) {
  return {
    canonicalPacketRef: packetPath,
    canonicalPacketId: 'packet:taste-layer:v1',
    canonicalPacketSha256: sha256(packetRaw),
    contentPackBinding: {
      ref: contentPackPath,
      id: 'content-pack:taste-layer:v1',
      sha256: sha256(contentPackRaw),
    },
    redcowBinding: {
      ref: redcowPath,
      id: 'redcow:taste-layer:v1',
      sha256: sha256(redcowRaw),
    },
    outputPath,
    spokenHook: 'The model did not fail. The taste layer did.',
    onScreenPromise: 'Why a perfect render can still be wrong',
    firstFrame: {
      concreteObject: 'Redacted technical-pass versus editorial-rejection evidence card',
      primaryText: 'TECHNICALLY VALID. STILL REJECTED.',
      proofSourceRef: 'sources/proof.md',
      visualHierarchy: ['editorial verdict', 'technical pass', 'source cue'],
      mobileLegibility: 'unknown' as const,
    },
    proofTensionCue: {
      proofStatement: 'The technical checks passed.',
      tensionStatement: 'The premise still failed the editorial gate.',
      sourceRef: 'sources/proof.md',
    },
    promiseAlignment: {
      promiseToPay: 'Show the upstream taste gate that technical checks cannot replace.',
      payoffBeatId: 'payoff',
      bodyPaysExactPromise: true as const,
    },
    transitions: [
      {
        id: 'opening-to-mechanism',
        fromBeatId: 'opening',
        toBeatId: 'mechanism',
        operation: 'reframe' as const,
        preservedObject: 'the rejected evidence card',
        stateChange: 'technical pass labels become inputs below an editorial gate',
        viewerModelDelta: 'technical completion is necessary but not sufficient',
        visualTreatment: 'compress the checks while keeping the rejection verdict fixed',
        decorativeOnly: false as const,
        providerCallRequired: false as const,
      },
      {
        id: 'mechanism-to-payoff',
        fromBeatId: 'mechanism',
        toBeatId: 'payoff',
        operation: 'reveal' as const,
        preservedObject: 'the editorial gate',
        stateChange: 'the gate resolves into four reusable questions',
        viewerModelDelta: 'the viewer can now apply the gate before rendering',
        visualTreatment: 'reveal one question at a time without replacing the proof object',
        decorativeOnly: false as const,
        providerCallRequired: false as const,
      },
    ],
    durationPolicy: 'preserve' as const,
    thirdPartyCreatorAssetsUsed: false as const,
    copiedCreatorWordingUsed: false as const,
    providerCallsAllowed: false as const,
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('buildOpeningPackage', () => {
  it('writes a packaging-only artifact bound to the canonical packet proof', async () => {
    const dir = await makeTempDir();
    const packetPath = join(dir, 'packet.json');
    const contentPackPath = join(dir, 'content-pack.json');
    const redcowPath = join(dir, 'redcow.json');
    const outputPath = join(dir, 'opening-package.json');
    const packetRaw = JSON.stringify({ evidence_refs: [{ ref: 'sources/proof.md' }] });
    const contentPackRaw = JSON.stringify({ id: 'content-pack:taste-layer:v1' });
    const redcowRaw = JSON.stringify({ id: 'redcow:taste-layer:v1' });
    await Promise.all([
      writeFile(packetPath, packetRaw, 'utf8'),
      writeFile(contentPackPath, contentPackRaw, 'utf8'),
      writeFile(redcowPath, redcowRaw, 'utf8'),
    ]);

    const result = await buildOpeningPackage(
      validRequest(
        packetPath,
        packetRaw,
        contentPackPath,
        contentPackRaw,
        redcowPath,
        redcowRaw,
        outputPath
      )
    );
    expect(result.result.checkCount).toBe(12);

    const outputRaw = await readFile(outputPath, 'utf8');
    expect(outputRaw.endsWith('\n')).toBe(true);
    expect(outputRaw.endsWith('\n\n')).toBe(false);
    const output = OpeningPackageOutputSchema.parse(JSON.parse(outputRaw));
    expect(output.validation.passed).toBe(true);
    expect(output.firstTransition.toBeatId).toBe('mechanism');
    expect(output.transitionTreatments).toHaveLength(2);
    expect(output.validation.bindings).toHaveLength(3);
    expect(output).not.toHaveProperty('script');
    expect(output).not.toHaveProperty('thesis');
    expect(output.exclusions).toContain('no_whole_video_rendering');
  });

  it('rejects a proof source that is absent from the canonical packet', async () => {
    const dir = await makeTempDir();
    const packetPath = join(dir, 'packet.json');
    const contentPackPath = join(dir, 'content-pack.json');
    const redcowPath = join(dir, 'redcow.json');
    const outputPath = join(dir, 'opening-package.json');
    const packetRaw = JSON.stringify({ evidence_refs: [] });
    const contentPackRaw = '{}';
    const redcowRaw = '{}';
    await Promise.all([
      writeFile(packetPath, packetRaw, 'utf8'),
      writeFile(contentPackPath, contentPackRaw, 'utf8'),
      writeFile(redcowPath, redcowRaw, 'utf8'),
    ]);

    await expect(
      buildOpeningPackage(
        validRequest(
          packetPath,
          packetRaw,
          contentPackPath,
          contentPackRaw,
          redcowPath,
          redcowRaw,
          outputPath
        )
      )
    ).rejects.toMatchObject({ code: 'PACKAGING_VALIDATION_FAILED' });
  });

  it('rejects a discontinuous transition chain', async () => {
    const dir = await makeTempDir();
    const packetPath = join(dir, 'packet.json');
    const contentPackPath = join(dir, 'content-pack.json');
    const redcowPath = join(dir, 'redcow.json');
    const outputPath = join(dir, 'opening-package.json');
    const packetRaw = JSON.stringify({ evidence_refs: [{ ref: 'sources/proof.md' }] });
    const contentPackRaw = '{}';
    const redcowRaw = '{}';
    await Promise.all([
      writeFile(packetPath, packetRaw, 'utf8'),
      writeFile(contentPackPath, contentPackRaw, 'utf8'),
      writeFile(redcowPath, redcowRaw, 'utf8'),
    ]);
    const request = validRequest(
      packetPath,
      packetRaw,
      contentPackPath,
      contentPackRaw,
      redcowPath,
      redcowRaw,
      outputPath
    );
    request.transitions[1] = { ...request.transitions[1], fromBeatId: 'unrelated-beat' };

    await expect(buildOpeningPackage(request)).rejects.toMatchObject({
      code: 'PACKAGING_VALIDATION_FAILED',
    });
  });

  it('binds a silent fast-lane treatment to the exact registry and final packet chain', async () => {
    const dir = await makeTempDir();
    const packetPath = join(dir, 'packet.json');
    const contentPackPath = join(dir, 'content-pack.json');
    const redcowPath = join(dir, 'redcow.json');
    const registryPath = join(dir, 'silent-format-registry.json');
    const outputPath = join(dir, 'opening-package.json');
    const contentPackRaw = JSON.stringify({ id: 'content-pack:taste-layer:v1' });
    const redcowRaw = JSON.stringify({ id: 'redcow:taste-layer:v1' });
    const registryRaw = JSON.stringify({
      schema_version: '1.0.0',
      shared: {
        duration_seconds: { minimum: 10, maximum: 20 },
        audio: 'absent',
        captions: 'large_exact_timing_required',
        focal_regions: 1,
        allowed_rights_basis: ['owned'],
        allowed_provider: ['local'],
        forbidden_media: ['voice', 'music', 'sfx', 'stock', 'third_party'],
        hard_gates_preserved: ['visual', 'rights', 'identity', 'exact_render', 'independent_qa'],
      },
      adapters: {
        'product-screen-demo': {
          phases: [{ id: 'result', start_seconds: 0, end_seconds: 20 }],
          reject: ['mock'],
        },
        'ui-native-thread-reveal': {
          phases: [{ id: 'question', start_seconds: 0, end_seconds: 20 }],
          reject: ['copied_trade_dress'],
        },
        'motion-card-lesson': {
          phases: [{ id: 'pattern', start_seconds: 0, end_seconds: 20 }],
          reject: ['typography_only', 'graphics_hide_real_proof'],
        },
      },
    });
    const packetRaw = JSON.stringify({
      status: 'production_final',
      chain_role: 'production_final',
      video_id: 'packet:taste-layer:v1',
      content_pack_binding: {
        content_pack_id: 'content-pack:taste-layer:v1',
        content_pack_ref: contentPackPath,
        content_pack_sha256: sha256(contentPackRaw),
      },
      redcow_binding: {
        status: 'bound',
        redcow_assessment_ref: redcowPath,
        redcow_assessment_sha256: sha256(redcowRaw),
      },
      silent_compiler_binding: {
        registry_ref: registryPath,
        registry_sha256: sha256(registryRaw),
        format_id: 'motion-card-lesson',
        audio_mode: 'non_voice',
        phase_scaling: 'deterministic_to_target_duration',
        caption_timing_source: 'exact_beat_start_end_seconds',
        primary_carrier_focal_regions: 1,
        owned_or_local_assets_only: true,
        silent_wav_carrier_required: true,
        disabled_checks: ['speech_signal_only', 'audio_signal_only'],
        preserved_gates: ['visual', 'rights', 'identity', 'exact_render', 'independent_qa'],
        reject_conditions: ['typography_only', 'graphics_hide_real_proof'],
      },
      beats: [
        { id: 'B01', start_seconds: 0, end_seconds: 2, on_screen_text: 'Pattern' },
        { id: 'B02', start_seconds: 2, end_seconds: 5, on_screen_text: 'Object one' },
        { id: 'B03', start_seconds: 5, end_seconds: 8, on_screen_text: 'Object two' },
        { id: 'B04', start_seconds: 8, end_seconds: 12, on_screen_text: 'Cause' },
        { id: 'B05', start_seconds: 12, end_seconds: 16, on_screen_text: 'Carry' },
      ],
      audio: {
        voice: 'none',
        music_source_ref: null,
        natural_sound_plan: 'none',
        sfx_plan: 'none',
      },
      generation: { enabled: false, quoted_cost_usd: 0, hard_cost_cap_usd: 0 },
      edit_contract: { target_duration_seconds: 16, duration_policy: 'preserve' },
      evidence_refs: [{ ref: 'sources/proof.md' }],
    });
    await Promise.all([
      writeFile(packetPath, packetRaw, 'utf8'),
      writeFile(contentPackPath, contentPackRaw, 'utf8'),
      writeFile(redcowPath, redcowRaw, 'utf8'),
      writeFile(registryPath, registryRaw, 'utf8'),
    ]);

    const result = await buildOpeningPackage({
      ...validRequest(
        packetPath,
        packetRaw,
        contentPackPath,
        contentPackRaw,
        redcowPath,
        redcowRaw,
        outputPath
      ),
      hookMode: 'on_screen_only',
      spokenHook: '',
      chainDisposition: 'production_final',
      formatRegistryBinding: {
        ref: registryPath,
        id: 'personal-content-silent-format-adapters@1.0.0',
        sha256: sha256(registryRaw),
        formatId: 'motion-card-lesson',
      },
    });

    expect(result.result.checkCount).toBe(27);
    const output = OpeningPackageOutputSchema.parse(JSON.parse(await readFile(outputPath, 'utf8')));
    expect(output.validation.bindings).toHaveLength(4);
    expect(output.validation.bindings.at(-1)).toMatchObject({
      role: 'format_registry',
      sha256: sha256(registryRaw),
    });
    expect(output.silentFastLaneTreatment).toMatchObject({
      formatId: 'motion-card-lesson',
      chainDisposition: 'production_final',
      audioMode: 'non_voice',
      targetDurationSeconds: 16,
      focalRegionCount: 1,
      ownedOrLocalAssetsOnly: true,
    });
    expect(output.spokenHook).toBe('');
  });
});
