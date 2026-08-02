import mongoose from "mongoose";

import {
  AutoReviewConfigModel,
  type AutoReviewConfigDocument,
} from "./review.auto-config.model.js";

export interface UpsertAutoReviewConfigInput {
  userId: string;
  knowledgeBaseId: string;
  githubRepoId: string;
  owner: string;
  repo: string;
  enabled: boolean;
  targetBranch: string;
  webhookId?: number | null;
  webhookActive: boolean;
}

export class AutoReviewConfigRepository {
  public async findByUserOwnerRepo(
    userId: string,
    owner: string,
    repo: string,
  ): Promise<AutoReviewConfigDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return AutoReviewConfigModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      owner: owner.toLowerCase(),
      repo,
    }).exec();
  }

  public async findEnabledByGithubRepoId(
    githubRepoId: string,
  ): Promise<AutoReviewConfigDocument[]> {
    return AutoReviewConfigModel.find({
      githubRepoId: String(githubRepoId),
      enabled: true,
    }).exec();
  }

  public async upsert(
    input: UpsertAutoReviewConfigInput,
  ): Promise<AutoReviewConfigDocument> {
    const update: Record<string, unknown> = {
      $set: {
        knowledgeBaseId: input.knowledgeBaseId,
        owner: input.owner.toLowerCase(),
        repo: input.repo,
        enabled: input.enabled,
        targetBranch: input.targetBranch,
        webhookActive: input.webhookActive,
      },
    };

    if (input.webhookId === null) {
      update.$unset = { webhookId: 1 };
    } else if (typeof input.webhookId === "number") {
      (update.$set as Record<string, unknown>).webhookId = input.webhookId;
    }

    const document = await AutoReviewConfigModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(input.userId),
        githubRepoId: input.githubRepoId,
      },
      update,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

    if (!document) {
      throw new Error("Failed to upsert auto-review config.");
    }

    return document;
  }
}
