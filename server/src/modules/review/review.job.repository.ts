import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

import {
  ReviewJobModel,
  type ReviewJobDocument,
} from "./review.job.model.js";

const STALE_ACTIVE_MS = 30 * 60 * 1000;

export interface EnqueueReviewJobInput {
  userId: string;
  knowledgeBaseId: string;
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
  deliveryId?: string;
  action: string;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export class ReviewJobRepository {
  public async enqueue(
    input: EnqueueReviewJobInput,
  ): Promise<ReviewJobDocument | null> {
    try {
      return await ReviewJobModel.create({
        jobId: randomUUID(),
        status: "queued",
        userId: new mongoose.Types.ObjectId(input.userId),
        knowledgeBaseId: input.knowledgeBaseId,
        owner: input.owner.toLowerCase(),
        repo: input.repo,
        prNumber: input.prNumber,
        headSha: input.headSha,
        ...(input.deliveryId ? { deliveryId: input.deliveryId } : {}),
        action: input.action,
        attempts: 0,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return null;
      }
      throw error;
    }
  }

  public async reclaimStaleJobs(): Promise<number> {
    const staleBefore = new Date(Date.now() - STALE_ACTIVE_MS);
    const result = await ReviewJobModel.updateMany(
      {
        status: "active",
        lockedAt: { $lt: staleBefore },
      },
      {
        $set: {
          status: "queued",
          errorMessage: "Job lock expired; re-queued for retry.",
        },
        $unset: {
          lockedAt: 1,
          startedAt: 1,
        },
      },
    ).exec();

    return result.modifiedCount;
  }

  public async claimNext(): Promise<ReviewJobDocument | null> {
    await this.reclaimStaleJobs();

    return ReviewJobModel.findOneAndUpdate(
      { status: "queued" },
      {
        $set: {
          status: "active",
          lockedAt: new Date(),
          startedAt: new Date(),
        },
        $inc: { attempts: 1 },
        $unset: { errorMessage: 1 },
      },
      {
        sort: { createdAt: 1 },
        new: true,
      },
    ).exec();
  }

  public async markDone(jobId: string): Promise<void> {
    await ReviewJobModel.updateOne(
      { jobId },
      {
        $set: {
          status: "done",
          finishedAt: new Date(),
        },
        $unset: {
          lockedAt: 1,
          errorMessage: 1,
        },
      },
    ).exec();
  }

  public async markFailed(jobId: string, errorMessage: string): Promise<void> {
    await ReviewJobModel.updateOne(
      { jobId },
      {
        $set: {
          status: "failed",
          errorMessage,
          finishedAt: new Date(),
        },
        $unset: {
          lockedAt: 1,
        },
      },
    ).exec();
  }
}
