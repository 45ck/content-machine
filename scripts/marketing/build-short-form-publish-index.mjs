#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const args = parseArgs(process.argv.slice(2));
const briefPackPath =
  args.briefs ??
  "docs/growth/assets/shorts/content-machine-briefs-2026-05.json";
const briefPack = readJson(briefPackPath);
const campaignId = briefPack.campaignId;
const batchRoot =
  args["batch-root"] ??
  join("marketing-artifacts", "short-form-batches", campaignId);
const landingUrl = normalizeUrl(
  args["landing-url"] ??
    process.env.VIBECOORD_SHORTS_LANDING_URL ??
    "https://vibecord.dev/",
);
const generatedAt = new Date().toISOString();
const reportNow = new Date(generatedAt);
const strict = args.strict === "true";

if (!campaignId) {
  throw new Error("Brief pack is missing campaignId");
}

mkdirSync(batchRoot, { recursive: true });

const orderedBriefs = orderBriefs(briefPack.briefs ?? []);
const posts = orderedBriefs.map((brief, index) =>
  buildPublishPost(brief, index + 1),
);
const summary = {
  total: posts.length,
  ready: posts.filter((post) => post.status === "ready_for_manual_upload")
    .length,
  published: posts.filter((post) => post.status === "published").length,
  blocked: posts.filter((post) => post.status === "blocked").length,
};
const index = {
  schemaVersion: "vibecoord.short-form-publish-index.v1",
  generatedAt,
  campaignId,
  sourceBriefPath: briefPackPath,
  batchRoot,
  landingUrl,
  summary,
  posts,
};

writeJson(join(batchRoot, "publish-ready-index.json"), index);
writeText(
  join(batchRoot, "publish-ready-index.md"),
  renderIndexMarkdown(index),
);
writeText(
  join(batchRoot, "metrics-snapshot-ledger.csv"),
  renderMetricsSnapshotLedger(index),
);
writeText(join(batchRoot, "publish-ledger.csv"), renderPublishLedger(index));

console.log(
  `Publish index ready: ${summary.ready}/${summary.total} posts ready at ${join(
    batchRoot,
    "publish-ready-index.md",
  )}`,
);

if (strict && summary.blocked > 0) {
  process.exitCode = 1;
}

function buildPublishPost(brief, priority) {
  const proof = briefPack.proofSources?.[brief.proofSource] ?? {};
  const proofManifest =
    proof.manifestPath && existsSync(proof.manifestPath)
      ? readJson(proof.manifestPath)
      : {};
  const briefRoot = join(batchRoot, brief.id);
  const requestPath = join(briefRoot, "content-machine-request.json");
  const packagePath = join(briefRoot, "platform-package.json");
  const request = existsSync(requestPath) ? readJson(requestPath) : {};
  const platformPackage = existsSync(packagePath)
    ? readJson(packagePath)
    : {
        platform: brief.platform,
        title: brief.platformPackage?.title,
        caption: brief.platformPackage?.caption,
        hashtags: brief.platformPackage?.hashtags ?? [],
        cta: brief.platformPackage?.cta,
        coverText: brief.hook?.coverText,
        utm: brief.platformPackage?.utm,
      };
  const finalVideoPath =
    request.outputs?.finalVideoPath ??
    join(briefRoot, "exports", `${brief.id}.mp4`);
  const thumbnailPath = join(briefRoot, "thumbs", "t0-hook.png");
  const reviewPath = join(briefRoot, "reviews", "publish-prep-review.json");
  const renderMetadataPath = join(briefRoot, "reviews", "render-metadata.json");
  const uploadPacketPath = join(briefRoot, "upload-packet.md");
  const decisionPath = join(briefRoot, "post-publish-decision.json");
  const metricsWindows = ["24h", "72h", "7d", "30d"];
  const metricsPaths = Object.fromEntries(
    metricsWindows.map((window) => [
      window,
      join(briefRoot, "metrics", `${window}.json`),
    ]),
  );
  const receiptPath =
    request.outputs?.receiptPath ??
    join(briefRoot, "receipts", `${brief.platform}.json`);
  const receipt = existsSync(receiptPath) ? readJson(receiptPath) : {};
  const hydratedMetrics = hydrateMetrics({
    metricsPaths,
    receipt,
    now: reportNow,
  });
  const review = existsSync(reviewPath) ? readJson(reviewPath) : {};
  const renderMetadata = existsSync(renderMetadataPath)
    ? readJson(renderMetadataPath)
    : {};
  const probe = existsSync(finalVideoPath)
    ? probeVideo(finalVideoPath)
    : { error: "missing final MP4" };
  const finalVideoSha256 = existsSync(finalVideoPath)
    ? sha256For(finalVideoPath)
    : "";
  const platformCopy = buildPlatformCopy(brief, platformPackage);
  const blockers = blockersFor({
    finalVideoPath,
    thumbnailPath,
    review,
    platformPackage,
    probe,
  });
  const published = receiptIndicatesPublished(receipt);
  const status = published
    ? "published"
    : blockers.length === 0
      ? "ready_for_manual_upload"
      : "blocked";
  const post = {
    priority,
    briefId: brief.id,
    platform: brief.platform,
    platformLabel: platformLabel(brief.platform),
    status,
    published,
    blockers,
    proofRunId: proof.proofRunId ?? request.proofRunId,
    sourceManifestPath: proof.manifestPath ?? request.proofManifestPath,
    sourceAssetPath: proofManifest.demoMachine?.videoPath ?? "",
    sourceAssetSha256: proofManifest.demoMachine?.videoSha256 ?? "",
    allowedClaim: proof.allowedClaim ?? request.allowedClaims?.[0],
    blockedClaims: proof.blockedClaims ?? request.forbiddenClaims ?? [],
    hook: brief.hook?.openingText,
    promise: brief.promise,
    finalVideoPath,
    finalVideoSha256,
    thumbnailPath,
    uploadPacketPath,
    receiptPath,
    reviewPath,
    renderMetadataPath,
    decisionPath,
    probe,
    reviewDecision: review.decision ?? "missing",
    platformCopy,
    renderStatus: renderMetadata.status ?? "missing",
    metricsWindows,
    metricsPaths,
    metrics: hydratedMetrics.metrics,
    metricsSummary: hydratedMetrics.summary,
  };

  mkdirSync(join(briefRoot, "receipts"), { recursive: true });
  mkdirSync(join(briefRoot, "metrics"), { recursive: true });
  writeText(uploadPacketPath, renderUploadPacket(post));
  writeReceiptTemplate(post);
  writeMetricsTemplates(post);
  writeDecisionTemplate(post);
  backfillMetricsDueAtFromReceipt(post, receipt);

  return post;
}

function backfillMetricsDueAtFromReceipt(post, receipt) {
  const publishedAtRaw = receipt?.publishedAt ?? receipt?.published_at ?? "";
  if (!publishedAtRaw) {
    return;
  }

  const publishedAt = parseDate(publishedAtRaw);
  if (!publishedAt) {
    return;
  }

  for (const window of post.metricsWindows ?? []) {
    const path = post.metricsPaths?.[window];
    if (!path || !existsSync(path)) {
      continue;
    }

    const snapshot = readJson(path);
    const hasDueAt = Boolean(snapshot.dueAt ?? snapshot.due_at);
    if (hasDueAt) {
      continue;
    }

    const ms = windowMs(window);
    if (!ms) {
      continue;
    }

    const dueAt = new Date(publishedAt.getTime() + ms).toISOString();
    writeJson(path, {
      ...snapshot,
      dueAt,
      publishedUrl:
        receipt?.publishedUrl ??
        receipt?.published_url ??
        snapshot.publishedUrl ??
        "",
    });
  }
}

function buildPlatformCopy(brief, platformPackage) {
  const hashtags = platformPackage.hashtags ?? [];
  const utm = platformPackage.utm ?? {};
  const trackingUrl = withUtm(landingUrl, utm);
  const caption = platformPackage.caption ?? "";
  const hashtagsLine = hashtags.join(" ");
  const captionWithHashtags = [caption, hashtagsLine]
    .filter(Boolean)
    .join("\n\n");

  return {
    title: platformPackage.title ?? brief.hook?.openingText,
    coverText: platformPackage.coverText ?? brief.hook?.coverText,
    caption,
    hashtags,
    hashtagsLine,
    captionWithHashtags,
    cta: platformPackage.cta,
    trackingUrl,
    firstComment: firstCommentFor(brief.platform, platformPackage.cta),
    utm,
  };
}

function blockersFor({
  finalVideoPath,
  thumbnailPath,
  review,
  platformPackage,
  probe,
}) {
  const blockers = [];

  if (!existsSync(finalVideoPath)) {
    blockers.push(`Missing final MP4: ${finalVideoPath}`);
  }

  if (!existsSync(thumbnailPath)) {
    blockers.push(`Missing hook thumbnail: ${thumbnailPath}`);
  }

  if (review.decision !== "ship") {
    blockers.push(
      `Publish review is not ship: ${review.decision ?? "missing"}`,
    );
  }

  if (Array.isArray(review.blockers) && review.blockers.length > 0) {
    blockers.push(`Publish review blockers: ${review.blockers.join("; ")}`);
  }

  if (
    !platformPackage.title ||
    !platformPackage.caption ||
    !platformPackage.cta
  ) {
    blockers.push("Missing title, caption, or CTA in platform package");
  }

  if (probe.error) {
    blockers.push(`ffprobe failed: ${probe.error}`);
  } else {
    if (probe.width !== 1080 || probe.height !== 1920) {
      blockers.push(`Wrong dimensions: ${probe.width}x${probe.height}`);
    }

    if (Math.abs(probe.durationSec - 30) > 0.75) {
      blockers.push(`Unexpected duration: ${probe.durationSec}s`);
    }

    if (!probe.hasAudio) {
      blockers.push("Missing audio stream");
    }
  }

  return blockers;
}

function renderUploadPacket(post) {
  const copy = post.platformCopy;
  const steps = uploadStepsFor(post.platform);
  const metricsRows = post.metricsWindows
    .map(
      (window) =>
        `- [ ] Capture ${window} metrics snapshot in \`${post.metricsPaths[window]}\``,
    )
    .join("\n");
  const blockerSection =
    post.blockers.length > 0
      ? post.blockers.map((blocker) => `- ${blocker}`).join("\n")
      : "- None";

  return `# Upload Packet: ${post.briefId}

**Status:** ${post.status} · **Platform:** ${post.platformLabel} · **Priority:** ${post.priority}

## Files

- Final MP4: \`${post.finalVideoPath}\`
- Final MP4 SHA-256: \`${post.finalVideoSha256}\`
- Source asset: \`${post.sourceAssetPath || "n/a"}\`
- Cover frame: \`${post.thumbnailPath}\`
- Review: \`${post.reviewPath}\`
- Receipt: \`${post.receiptPath}\`

## Operator Commands

\`\`\`bash
# Open upload page + set clipboard (caption + hashtags + tracking URL)
npm run marketing:shorts:queue:assist -- --brief-id ${post.briefId}

# After publishing, write the receipt
npm run marketing:shorts:queue:mark-posted -- --brief-id ${post.briefId} --url <publishedUrl> --handle <accountHandle> --at <iso>

# Capture metrics snapshots (examples)
npm run marketing:shorts:queue:mark-metrics -- --brief-id ${post.briefId} --window 24h --views <n> --likes <n> --comments <n> --shares <n> --saves <n> --at <iso> --by <name>
\`\`\`

## Copy/Paste Platform Copy

Title:

\`\`\`text
${copy.title ?? ""}
\`\`\`

Cover text:

\`\`\`text
${copy.coverText ?? ""}
\`\`\`

Caption with hashtags:

\`\`\`text
${copy.captionWithHashtags}
\`\`\`

First comment:

\`\`\`text
${copy.firstComment}
\`\`\`

Tracking URL:

\`\`\`text
${copy.trackingUrl}
\`\`\`

CTA:

\`\`\`text
${copy.cta ?? ""}
\`\`\`

## Manual Upload Steps

${steps.map((step) => `- [ ] ${step}`).join("\n")}

## Claim Boundary

Allowed claim:

> ${post.allowedClaim ?? "Missing allowed claim."}

Do not claim:

${(post.blockedClaims ?? []).map((claim) => `- ${claim}`).join("\n")}

## Metrics

${metricsRows}

## Blockers

${blockerSection}
`;
}

function renderIndexMarkdown(index) {
  const rows = index.posts
    .map(
      (post) =>
        `| ${[
          post.priority,
          `\`${post.briefId}\``,
          post.platformLabel,
          post.status,
          `${post.metricsSummary?.overdue ?? 0}/${post.metricsSummary?.dueSoon ?? 0}`,
          post.reviewDecision,
          post.blockers.length,
          `\`${post.finalVideoPath}\``,
          `\`${post.uploadPacketPath}\``,
        ]
          .map(markdownCell)
          .join(" | ")} |`,
    )
    .join("\n");

  return `# Publish-Ready Index — ${index.campaignId}

**Generated:** ${index.generatedAt} · **Ready:** ${index.summary.ready}/${index.summary.total} · **Published:** ${index.summary.published} · **Blocked:** ${index.summary.blocked}

Use this local index as the operator handoff after rendering the short-form batch.
Generated media and receipts stay under \`marketing-artifacts/\` unless explicitly promoted.

## Command

\`\`\`bash
npm run marketing:shorts:publish-index
\`\`\`

## Posts

| # | Brief | Platform | Status | Metrics (overdue/due) | Review | Blockers | MP4 | Upload Packet |
| - | ----- | -------- | ------ | --------------------- | ------ | -------- | --- | ------------- |
${rows}

## Rules

- Upload manually or with a native scheduler only.
- Watch the MP4 on a phone-sized preview before publishing.
- Use the upload packet copy exactly unless the operator improves it without adding blocked claims.
- Fill the receipt JSON immediately after publishing.
- Capture \`24h\`, \`72h\`, \`7d\`, and \`30d\` metrics in \`metrics-snapshot-ledger.csv\`.
`;
}

function renderMetricsSnapshotLedger(index) {
  const rows = [
    [
      "brief_id",
      "platform",
      "snapshot_window",
      "due_at",
      "captured_at",
      "published_url",
      "views",
      "likes",
      "comments",
      "saves",
      "shares",
      "profile_visits",
      "qualified_replies",
      "landing_clicks",
      "signups",
      "first_prompts",
      "decision",
      "notes",
    ],
  ];

  function readJsonIfExists(path) {
    if (!path || !existsSync(path)) return null;
    try {
      return readJson(path);
    } catch {
      return null;
    }
  }

  function getDeep(obj, path) {
    if (!obj) return undefined;
    const parts = String(path).split(".");
    let current = obj;
    for (const part of parts) {
      if (!current || typeof current !== "object") return undefined;
      current = current[part];
    }
    return current;
  }

  function pickMeaningful(obj, candidatePaths) {
    for (const path of candidatePaths) {
      const value = getDeep(obj, path);
      if (value === null || value === undefined) continue;
      if (typeof value === "number") {
        if (Number.isFinite(value)) return value;
        continue;
      }
      if (typeof value === "boolean") return value;
      const raw = String(value);
      if (raw.trim()) return raw;
    }
    return "";
  }

  function pickNumber(obj, candidatePaths) {
    const value = pickMeaningful(obj, candidatePaths);
    if (typeof value === "number") return String(value);
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? String(parsed) : "";
  }

  function pickString(obj, candidatePaths) {
    const value = pickMeaningful(obj, candidatePaths);
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function pickIsoDate(obj, candidatePaths) {
    const raw = pickString(obj, candidatePaths);
    const date = parseDate(raw);
    return date ? date.toISOString() : "";
  }

  for (const post of index.posts) {
    const receipt = readJsonIfExists(post.receiptPath) ?? {};
    const receiptPublishedAt = parseDate(
      receipt.publishedAt ?? receipt.published_at,
    );
    const receiptPublishedUrl = pickString(receipt, [
      "publishedUrl",
      "published_url",
    ]);

    for (const window of post.metricsWindows) {
      const snapshotPath = post.metricsPaths?.[window];
      const snapshot = readJsonIfExists(snapshotPath) ?? {};
      const publishedUrl =
        pickString(snapshot, ["publishedUrl", "published_url"]) ||
        receiptPublishedUrl;

      const dueAtIso =
        pickIsoDate(snapshot, ["dueAt", "due_at"]) ||
        (receiptPublishedAt && windowMs(window)
          ? new Date(
              receiptPublishedAt.getTime() + windowMs(window),
            ).toISOString()
          : "");
      const capturedAtIso = pickIsoDate(snapshot, ["capturedAt", "captured_at"]);

      const views = pickNumber(snapshot, [
        "views",
        "viewCount",
        "view_count",
        "rawPlatformMetrics.views",
        "raw_platform_metrics.views",
        "rawPlatformMetrics.viewCount",
        "raw_platform_metrics.view_count",
      ]);
      const likes = pickNumber(snapshot, [
        "likes",
        "likeCount",
        "like_count",
        "rawPlatformMetrics.likes",
        "raw_platform_metrics.likes",
        "rawPlatformMetrics.likeCount",
        "raw_platform_metrics.like_count",
      ]);
      const comments = pickNumber(snapshot, [
        "comments",
        "commentCount",
        "comment_count",
        "rawPlatformMetrics.comments",
        "raw_platform_metrics.comments",
        "rawPlatformMetrics.commentCount",
        "raw_platform_metrics.comment_count",
      ]);
      const saves = pickNumber(snapshot, [
        "saves",
        "saveCount",
        "save_count",
        "rawPlatformMetrics.saves",
        "raw_platform_metrics.saves",
        "rawPlatformMetrics.saveCount",
        "raw_platform_metrics.save_count",
      ]);
      const shares = pickNumber(snapshot, [
        "shares",
        "shareCount",
        "share_count",
        "rawPlatformMetrics.shares",
        "raw_platform_metrics.shares",
        "rawPlatformMetrics.shareCount",
        "raw_platform_metrics.share_count",
      ]);
      const profileVisits = pickNumber(snapshot, [
        "profileVisits",
        "profile_visits",
        "rawPlatformMetrics.profileVisits",
        "raw_platform_metrics.profile_visits",
        "rawPlatformMetrics.profile_visits",
        "raw_platform_metrics.profileVisits",
      ]);
      const qualifiedReplies = pickNumber(snapshot, [
        "qualifiedReplies",
        "qualified_replies",
        "normalizedMetrics.qualifiedReplies",
        "normalized_metrics.qualified_replies",
        "normalizedMetrics.qualified_replies",
        "normalized_metrics.qualifiedReplies",
      ]);
      const landingClicks = pickNumber(snapshot, [
        "landingClicks",
        "landing_clicks",
        "funnelMetrics.landingClicks",
        "funnel_metrics.landing_clicks",
        "funnelMetrics.landing_clicks",
        "funnel_metrics.landingClicks",
      ]);
      const signups = pickNumber(snapshot, [
        "signups",
        "funnelMetrics.signups",
        "funnel_metrics.signups",
      ]);
      const firstPrompts = pickNumber(snapshot, [
        "firstPrompts",
        "first_prompts",
        "funnelMetrics.firstPrompts",
        "funnel_metrics.first_prompts",
        "funnelMetrics.first_prompts",
        "funnel_metrics.firstPrompts",
      ]);
      const decision = pickString(snapshot, [
        "decision",
        "decision_status",
        "decisionStatus",
      ]);
      const notes = pickString(snapshot, ["notes", "note"]);

      rows.push([
        post.briefId,
        post.platform,
        window,
        dueAtIso,
        capturedAtIso,
        publishedUrl,
        views,
        likes,
        comments,
        saves,
        shares,
        profileVisits,
        qualifiedReplies,
        landingClicks,
        signups,
        firstPrompts,
        decision,
        notes,
      ]);
    }
  }

  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function renderPublishLedger(index) {
  const rows = [
    [
      "content_id",
      "campaign_id",
      "brief_id",
      "proof_run_id",
      "platform",
      "source_manifest_path",
      "source_asset_path",
      "final_video_path",
      "hook_variant_id",
      "title",
      "caption",
      "cover_text",
      "cta",
      "cta_url",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "scheduled_at",
      "published_at",
      "account_handle",
      "platform_post_id",
      "published_url",
      "receipt_path",
      "review_status",
      "publish_packet_path",
      "metrics_24h_due_at",
      "metrics_24h_captured_at",
      "metrics_24h_path",
      "metrics_72h_due_at",
      "metrics_72h_captured_at",
      "metrics_72h_path",
      "metrics_7d_due_at",
      "metrics_7d_captured_at",
      "metrics_7d_path",
      "metrics_30d_due_at",
      "metrics_30d_captured_at",
      "metrics_30d_path",
      "decision_status",
      "decision_at",
      "decision_path",
      "next_decision",
      "followup_brief_id",
      "notes",
    ],
  ];

  for (const post of index.posts) {
    const receipt = existsSync(post.receiptPath)
      ? readJson(post.receiptPath)
      : {};
    const publishedAt = receipt.publishedAt ?? receipt.published_at ?? "";
    const accountHandle = receipt.accountHandle ?? receipt.account_handle ?? "";
    const platformPostId =
      receipt.platformPostId ?? receipt.platform_post_id ?? "";
    const publishedUrl = receipt.publishedUrl ?? receipt.published_url ?? "";
    rows.push([
      post.briefId,
      index.campaignId,
      post.briefId,
      post.proofRunId,
      post.platform,
      post.sourceManifestPath,
      post.sourceAssetPath,
      post.finalVideoPath,
      "",
      post.platformCopy.title,
      post.platformCopy.caption,
      post.platformCopy.coverText,
      post.platformCopy.cta,
      post.platformCopy.trackingUrl,
      post.platformCopy.utm.source,
      post.platformCopy.utm.medium,
      post.platformCopy.utm.campaign,
      post.platformCopy.utm.content,
      "",
      publishedAt,
      accountHandle,
      platformPostId,
      publishedUrl,
      post.receiptPath,
      post.status,
      post.uploadPacketPath,
      "",
      "",
      post.metricsPaths["24h"],
      "",
      "",
      post.metricsPaths["72h"],
      "",
      "",
      post.metricsPaths["7d"],
      "",
      "",
      post.metricsPaths["30d"],
      "pending",
      "",
      post.decisionPath,
      "",
      "",
      "",
    ]);
  }

  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function writeReceiptTemplate(post) {
  const existing = existsSync(post.receiptPath)
    ? readJson(post.receiptPath)
    : {};

  if (existing.status === "published" || existing.publishedUrl) {
    return;
  }

  writeJson(post.receiptPath, {
    schemaVersion: "vibecoord.short-form-publish-receipt.v1",
    status: "pending_manual_upload",
    campaignId,
    briefId: post.briefId,
    platform: post.platform,
    publishMode: "manual_native",
    accountHandle: "",
    platformPostId: "",
    publishedUrl: "",
    publishedAt: "",
    uploader: "",
    finalVideoPath: post.finalVideoPath,
    finalVideoSha256: post.finalVideoSha256,
    sourceAssetPath: post.sourceAssetPath,
    sourceAssetSha256: post.sourceAssetSha256,
    uploadPacketPath: post.uploadPacketPath,
    caption: post.platformCopy.caption,
    cta: post.platformCopy.cta,
    utm: post.platformCopy.utm,
    screenshotPaths: [],
    screenshots: {
      prePublishPreview: "",
      publishedPost: "",
      receiptExport: "",
    },
    metricsSnapshotPath: join(batchRoot, "metrics-snapshot-ledger.csv"),
    redactionStatus: "public_safe",
    notes: "",
    ...existing,
    finalVideoPath: post.finalVideoPath,
    finalVideoSha256: post.finalVideoSha256,
    sourceAssetPath: post.sourceAssetPath,
    sourceAssetSha256: post.sourceAssetSha256,
    uploadPacketPath: post.uploadPacketPath,
    metricsSnapshotPath: join(batchRoot, "metrics-snapshot-ledger.csv"),
  });
}

function writeMetricsTemplates(post) {
  for (const window of post.metricsWindows) {
    const path = post.metricsPaths[window];

    if (existsSync(path)) {
      continue;
    }

    writeJson(path, {
      schemaVersion: "vibecoord.short-form-metrics-snapshot.v1",
      campaignId,
      briefId: post.briefId,
      platform: post.platform,
      window,
      dueAt: "",
      capturedAt: "",
      capturedBy: "",
      publishedUrl: "",
      rawPlatformMetrics: {
        views: null,
        likes: null,
        comments: null,
        shares: null,
        saves: null,
        averageWatchTimeSec: null,
        completionRate: null,
        profileVisits: null,
        followersGained: null,
      },
      normalizedMetrics: {
        commentsPerView: null,
        sharesPerView: null,
        savesPerView: null,
        qualifiedReplies: null,
      },
      funnelMetrics: {
        landingClicks: null,
        discordJoins: null,
        signups: null,
        firstPrompts: null,
        proofIntent: null,
        paidIntent: null,
      },
      evidence: {
        platformAnalyticsScreenshot: "",
        platformCsvExport: "",
        postScreenshot: "",
        analyticsExport: "",
      },
      notes: "",
    });
  }
}

function writeDecisionTemplate(post) {
  if (existsSync(post.decisionPath)) {
    return;
  }

  writeJson(post.decisionPath, {
    schemaVersion: "vibecoord.short-form-post-publish-decision.v1",
    campaignId,
    briefId: post.briefId,
    platform: post.platform,
    decision: "hold",
    allowedDecisions: [
      "repeat",
      "revise_hook",
      "revise_claim",
      "revise_visuals",
      "kill",
      "hold",
    ],
    decidedAt: "",
    decidedBy: "",
    evidenceSnapshotPaths: [],
    reasonCodes: [],
    summary: "",
    nextAction: "",
    followupBriefId: "",
    followupFormat: "",
    notes: "",
  });
}

function uploadStepsFor(platform) {
  if (platform === "tiktok") {
    return [
      "Open TikTok Studio or the native app; do not use unattended browser posting.",
      "Upload the final MP4.",
      "Set the cover from the hook frame or first result frame.",
      "Paste the caption with hashtags.",
      "Preview captions, proof text, and bottom chrome on a phone-sized view.",
      "Publish or schedule natively.",
      "Paste the platform URL, timestamp, account, and screenshot path into the receipt JSON.",
    ];
  }

  if (platform === "instagram_reels") {
    return [
      "Open the professional Instagram account or Meta Business Suite.",
      "Create a Reel from the final MP4; do not repost a TikTok-watermarked export.",
      "Set the cover from the hook frame.",
      "Paste the caption with hashtags.",
      "Preview proof text, safe zones, and audio before publish.",
      "Publish or schedule natively.",
      "Paste the platform URL, timestamp, account, and screenshot path into the receipt JSON.",
    ];
  }

  if (platform === "youtube_shorts") {
    return [
      "Open YouTube Studio.",
      "Upload the final MP4 as a Short.",
      "Use the title field from this packet.",
      "Paste the caption copy into the description.",
      "Preview that the first frame and title match the search promise.",
      "Publish or schedule natively.",
      "Paste the platform URL, timestamp, account, and screenshot path into the receipt JSON.",
    ];
  }

  return [
    "Upload through the platform's native manual flow.",
    "Paste the platform URL, timestamp, account, and screenshot path into the receipt JSON.",
  ];
}

function firstCommentFor(platform, cta) {
  if (platform === "instagram_reels") {
    return cta ?? "Comment the workflow you want next.";
  }

  if (platform === "youtube_shorts") {
    return cta ?? "Comment the workflow you want next.";
  }

  return cta ?? "Comment the bot your server needs next.";
}

function probeVideo(path) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=codec_type,width,height,avg_frame_rate",
      "-of",
      "json",
      path,
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    return { error: result.stderr || "ffprobe failed" };
  }

  const probe = JSON.parse(result.stdout);
  const videoStream = probe.streams?.find(
    (stream) => stream.codec_type === "video",
  );
  const audioStream = probe.streams?.find(
    (stream) => stream.codec_type === "audio",
  );

  return {
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    avgFrameRate: videoStream?.avg_frame_rate,
    durationSec: Number.parseFloat(probe.format?.duration ?? "0"),
    hasAudio: Boolean(audioStream),
  };
}

function sha256For(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function orderBriefs(briefs) {
  const campaignPriorityOrder = [
    "vc-2026-05-001-discord-proof-tiktok",
    "vc-2026-05-003-discord-howto-shorts",
    "vc-2026-05-002-discord-template-reels",
    "vc-2026-05-004-six-bots-tiktok",
    "vc-2026-05-005-proof-boundary-reels",
    "vc-2026-05-006-apply-flow-reels",
    "vc-2026-05-007-whitelist-pain-tiktok",
    "vc-2026-05-008-minecraft-proof-tiktok",
    "vc-2026-05-009-luanti-boundary-reels",
    "vc-2026-05-010-weekly-learning-shorts",
  ];
  const byId = new Map(briefs.map((brief) => [brief.id, brief]));
  const ordered = campaignPriorityOrder
    .map((id) => byId.get(id))
    .filter(Boolean);

  for (const brief of briefs) {
    if (!campaignPriorityOrder.includes(brief.id)) {
      ordered.push(brief);
    }
  }

  return ordered;
}

function platformLabel(platform) {
  return (
    {
      tiktok: "TikTok",
      instagram_reels: "Instagram Reels",
      youtube_shorts: "YouTube Shorts",
    }[platform] ?? platform
  );
}

function withUtm(baseUrl, utm) {
  const url = new URL(baseUrl);
  const params = {
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
    utm_content: utm.content,
  };

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function normalizeUrl(value) {
  const url = new URL(value);
  return url.toString();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|");
}

function csvCell(value) {
  const stringValue = String(value ?? "");
  if (!/[",\n\r]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replaceAll('"', '""')}"`;
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (!key) {
      continue;
    }

    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    const next = rawArgs[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = "true";
    }
  }

  return parsed;
}

function receiptIndicatesPublished(receipt) {
  if (!receipt || typeof receipt !== "object") {
    return false;
  }

  if (receipt.status === "published") {
    return true;
  }

  const publishedUrl = receipt.publishedUrl ?? receipt.published_url;
  if (typeof publishedUrl === "string" && publishedUrl.trim()) {
    return true;
  }

  const platformPostId = receipt.platformPostId ?? receipt.platform_post_id;
  if (typeof platformPostId === "string" && platformPostId.trim()) {
    return true;
  }

  const publishedAt = receipt.publishedAt ?? receipt.published_at;
  if (typeof publishedAt === "string" && publishedAt.trim()) {
    return true;
  }

  return false;
}

function hydrateMetrics({ metricsPaths, receipt, now }) {
  const metrics = {};
  const summary = { overdue: 0, dueSoon: 0 };

  const windows = Object.keys(metricsPaths ?? {});
  const publishedAt = parseDate(receipt?.publishedAt ?? receipt?.published_at);
  for (const window of windows) {
    const path = metricsPaths[window];
    if (!path || !existsSync(path)) {
      metrics[window] = { path, status: "missing", dueAt: "", capturedAt: "" };
      continue;
    }

    const snapshot = readJson(path);
    const dueAt =
      parseDate(snapshot.dueAt ?? snapshot.due_at) ??
      (publishedAt
        ? new Date(publishedAt.getTime() + (windowMs(window) ?? 0))
        : null);
    const capturedAt = parseDate(snapshot.capturedAt ?? snapshot.captured_at);
    const status = windowStatus({ dueAt, capturedAt, now });

    if (status === "overdue") summary.overdue += 1;
    if (status === "due_soon") summary.dueSoon += 1;

    metrics[window] = {
      path,
      status,
      dueAt: dueAt ? dueAt.toISOString() : "",
      capturedAt: capturedAt ? capturedAt.toISOString() : "",
    };
  }

  return { metrics, summary };
}

function windowStatus({ dueAt, capturedAt, now }) {
  if (capturedAt) return "captured";
  if (!dueAt) return "unscheduled";
  const ms = dueAt.getTime() - now.getTime();
  if (ms < 0) return "overdue";
  if (ms <= 24 * 60 * 60 * 1000) return "due_soon";
  return "pending";
}

function windowMs(window) {
  const raw = String(window ?? "").trim();
  if (!raw) return null;

  const match = raw.match(/^(\d+)\s*([mhdw])$/i);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(amount) || amount < 0) return null;
    switch (unit) {
      case "m":
        return amount * 60 * 1000;
      case "h":
        return amount * 60 * 60 * 1000;
      case "d":
        return amount * 24 * 60 * 60 * 1000;
      case "w":
        return amount * 7 * 24 * 60 * 60 * 1000;
      default:
        return null;
    }
  }

  switch (raw) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "72h":
      return 72 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

function parseDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
