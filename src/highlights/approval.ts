import {
  HIGHLIGHT_APPROVAL_SCHEMA_VERSION,
  HighlightApprovalOutputSchema,
  HighlightSelectionOutputSchema,
  type HighlightApprovalOutput,
  type HighlightCandidate,
  type HighlightSelectionOutput,
} from '../domain';

export interface CreateHighlightApprovalOptions {
  sourceCandidatesPath: string;
  approvedCandidateIds?: string[];
  rejectedCandidateIds?: string[];
  actor?: string;
  decidedAt?: string;
  notesByCandidateId?: Record<string, string | null>;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function defaultApprovedCandidateIds(selection: HighlightSelectionOutput): string[] {
  if (selection.selectedCandidateId) return [selection.selectedCandidateId];
  return selection.candidates[0] ? [selection.candidates[0].id] : [];
}

function annotateCandidate(
  candidate: HighlightCandidate,
  approvedIds: Set<string>,
  rejectedIds: Set<string>,
  notesByCandidateId: Record<string, string | null>
): HighlightCandidate {
  const approval = approvedIds.has(candidate.id)
    ? 'approved'
    : rejectedIds.has(candidate.id)
      ? 'rejected'
      : 'pending';

  return {
    ...candidate,
    approval,
    approvalNotes: notesByCandidateId[candidate.id] ?? candidate.approvalNotes ?? null,
  };
}

export function createHighlightApproval(
  selectionInput: HighlightSelectionOutput,
  options: CreateHighlightApprovalOptions
): HighlightApprovalOutput {
  const selection = HighlightSelectionOutputSchema.parse(selectionInput);
  const approvedCandidateIds = unique(
    options.approvedCandidateIds?.length
      ? options.approvedCandidateIds
      : defaultApprovedCandidateIds(selection)
  );
  const approved = new Set(approvedCandidateIds);
  const rejectedCandidateIds = unique(
    options.rejectedCandidateIds?.length
      ? options.rejectedCandidateIds
      : selection.candidates
          .filter((candidate) => !approved.has(candidate.id))
          .map((candidate) => candidate.id)
  );
  const knownIds = new Set(selection.candidates.map((candidate) => candidate.id));
  const warnings: string[] = [];

  for (const id of [...approvedCandidateIds, ...rejectedCandidateIds]) {
    if (!knownIds.has(id)) warnings.push(`Unknown candidate id: ${id}`);
  }

  const approvedKnownIds = approvedCandidateIds.filter((id) => knownIds.has(id));
  const rejectedKnownIds = rejectedCandidateIds.filter(
    (id) => knownIds.has(id) && !approved.has(id)
  );
  const annotated = selection.candidates.map((candidate) =>
    annotateCandidate(
      candidate,
      new Set(approvedKnownIds),
      new Set(rejectedKnownIds),
      options.notesByCandidateId ?? {}
    )
  );

  return HighlightApprovalOutputSchema.parse({
    schemaVersion: HIGHLIGHT_APPROVAL_SCHEMA_VERSION,
    sourceCandidatesPath: options.sourceCandidatesPath,
    actor: options.actor ?? 'local-agent',
    decidedAt: options.decidedAt ?? new Date().toISOString(),
    approvedCandidateIds: approvedKnownIds,
    rejectedCandidateIds: rejectedKnownIds,
    decisions: annotated
      .filter((candidate) => candidate.approval !== 'pending')
      .map((candidate) => ({
        candidateId: candidate.id,
        approval: candidate.approval,
        notes: candidate.approvalNotes,
        renderOrder:
          candidate.approval === 'approved' ? approvedKnownIds.indexOf(candidate.id) + 1 : null,
      })),
    candidates: annotated,
    warnings,
  });
}
