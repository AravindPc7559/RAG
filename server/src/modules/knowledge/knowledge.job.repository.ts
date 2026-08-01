import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

import {
  KnowledgeJobModel,
  type KnowledgeJobDocument,
  type KnowledgeJobType,
} from "./knowledge.job.model.js";

const STALE_ACTIVE_MS = 30 * 60 * 1000;

export interface EnqueueKnowledgeJobInput {
  type: KnowledgeJobType;
  userId: string;
  knowledgeBaseId: string;
  owner: string;
  repo: string;
  githubOwner: string;
  githubRepo: string;
  defaultBranch: string;
  fullName: string;
}

export class KnowledgeJobRepository {
  public async enqueue(
    input: EnqueueKnowledgeJobInput,
  ): Promise<KnowledgeJobDocument> {
    return KnowledgeJobModel.create({
      jobId: randomUUID(),
      type: input.type,
      status: "queued",
      userId: new mongoose.Types.ObjectId(input.userId),
      knowledgeBaseId: input.knowledgeBaseId,
      owner: input.owner,
      repo: input.repo,
      githubOwner: input.githubOwner,
      githubRepo: input.githubRepo,
      defaultBranch: input.defaultBranch,
      fullName: input.fullName,
      attempts: 0,
    });
  }

  public async reclaimStaleJobs(): Promise<number> {
    const staleBefore = new Date(Date.now() - STALE_ACTIVE_MS);
    const result = await KnowledgeJobModel.updateMany(
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

  public async claimNext(): Promise<KnowledgeJobDocument | null> {
    await this.reclaimStaleJobs();

    return KnowledgeJobModel.findOneAndUpdate(
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
    await KnowledgeJobModel.updateOne(
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
    await KnowledgeJobModel.updateOne(
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

  public async hasActiveOrQueuedJob(
    knowledgeBaseId: string,
  ): Promise<boolean> {
    const count = await KnowledgeJobModel.countDocuments({
      knowledgeBaseId,
      status: { $in: ["queued", "active"] },
    }).exec();
    return count > 0;
  }
}
