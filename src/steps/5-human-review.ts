/**
 * Step 5: Human Review (Manual Gate)
 *
 * This step doesn't execute automatically - it represents the
 * human decision point in the pipeline. The Review Queue provides:
 *
 * 1. Script review + editing
 * 2. Preview video before export
 * 3. Approve/Reject/Request changes
 * 4. Notes for analytics correlation
 *
 * The actual UI would be in a frontend package.
 * This module provides the data structures and queue management.
 */

import { v4 as uuid } from 'uuid';
import { z } from 'zod';

// Review queue item schema
export const ReviewItemSchema = z.object({
  id: z.string().uuid(),
  pipelineJobId: z.string().uuid(),
  contentObjectId: z.string().uuid(),

  // Content to review
  trendTitle: z.string(),
  hook: z.string(),
  script: z.object({
    scenes: z.array(z.object({
      number: z.number(),
      duration: z.number(),
      voiceover: z.string(),
      visualDescription: z.string(),
    })),
  }),
  previewVideoPath: z.string().nullable(),

  // Review state
  status: z.enum(['pending', 'approved', 'rejected', 'changes-requested']),
  assignedTo: z.string().nullable(),
  priority: z.enum(['high', 'medium', 'low']),

  // Feedback
  reviewerNotes: z.string().nullable(),
  editedScript: z.object({
    scenes: z.array(z.object({
      number: z.number(),
      duration: z.number(),
      voiceover: z.string(),
      visualDescription: z.string(),
    })),
  }).nullable(),

  // Timestamps
  createdAt: z.coerce.date(),
  reviewedAt: z.coerce.date().nullable(),
});

export type ReviewItem = z.infer<typeof ReviewItemSchema>;

export interface ReviewDecision {
  status: 'approved' | 'rejected' | 'changes-requested';
  notes: string | null;
  editedScript: ReviewItem['editedScript'];
}

/**
 * Human Review Queue Manager
 *
 * In production, this would be backed by a database table.
 * For now, it provides the interface that the frontend
 * and orchestrator use.
 */
export class HumanReviewQueue {
  private reviewItems: Map<string, ReviewItem> = new Map();

  /**
   * Add a pipeline job to the review queue
   */
  async enqueue(params: {
    pipelineJobId: string;
    contentObjectId: string;
    trendTitle: string;
    hook: string;
    script: ReviewItem['script'];
    previewVideoPath: string | null;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<ReviewItem> {
    const item: ReviewItem = {
      id: uuid(),
      pipelineJobId: params.pipelineJobId,
      contentObjectId: params.contentObjectId,
      trendTitle: params.trendTitle,
      hook: params.hook,
      script: params.script,
      previewVideoPath: params.previewVideoPath,
      status: 'pending',
      assignedTo: null,
      priority: params.priority ?? 'medium',
      reviewerNotes: null,
      editedScript: null,
      createdAt: new Date(),
      reviewedAt: null,
    };

    this.reviewItems.set(item.id, item);
    console.log(`[Step 5] Added to review queue: ${item.id}`);

    return item;
  }

  /**
   * Get all pending reviews
   */
  async getPending(): Promise<ReviewItem[]> {
    return Array.from(this.reviewItems.values())
      .filter((item) => item.status === 'pending')
      .sort((a, b) => {
        // High priority first
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // Then by creation date
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  /**
   * Get a specific review item
   */
  async getById(id: string): Promise<ReviewItem | null> {
    return this.reviewItems.get(id) ?? null;
  }

  /**
   * Get review item by pipeline job ID
   */
  async getByJobId(pipelineJobId: string): Promise<ReviewItem | null> {
    for (const item of this.reviewItems.values()) {
      if (item.pipelineJobId === pipelineJobId) return item;
    }
    return null;
  }

  /**
   * Submit a review decision
   */
  async submitReview(
    itemId: string,
    decision: ReviewDecision
  ): Promise<ReviewItem> {
    const item = this.reviewItems.get(itemId);
    if (!item) {
      throw new Error(`Review item not found: ${itemId}`);
    }

    const updated: ReviewItem = {
      ...item,
      status: decision.status,
      reviewerNotes: decision.notes,
      editedScript: decision.editedScript,
      reviewedAt: new Date(),
    };

    this.reviewItems.set(itemId, updated);

    console.log(`[Step 5] Review submitted: ${itemId} → ${decision.status}`);

    return updated;
  }

  /**
   * Assign reviewer
   */
  async assign(itemId: string, userId: string): Promise<void> {
    const item = this.reviewItems.get(itemId);
    if (!item) throw new Error(`Review item not found: ${itemId}`);

    this.reviewItems.set(itemId, {
      ...item,
      assignedTo: userId,
    });
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    changesRequested: number;
  }> {
    const items = Array.from(this.reviewItems.values());
    return {
      pending: items.filter((i) => i.status === 'pending').length,
      approved: items.filter((i) => i.status === 'approved').length,
      rejected: items.filter((i) => i.status === 'rejected').length,
      changesRequested: items.filter((i) => i.status === 'changes-requested').length,
    };
  }
}

// Singleton instance (in production, replace with DB-backed implementation)
export const reviewQueue = new HumanReviewQueue();
