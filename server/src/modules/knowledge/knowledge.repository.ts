import mongoose from "mongoose";

import {
  KnowledgeBaseModel,
  type KnowledgeBaseDocument,
} from "./knowledge.model.js";
import type { KnowledgeBaseStatus } from "./knowledge.types.js";

export interface CreateKnowledgeBaseInput {
  userId: string;
  knowledgeBaseId: string;
  githubRepoId: string;
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  htmlUrl: string;
  status?: KnowledgeBaseStatus;
}

export class KnowledgeRepository {
  public async create(
    input: CreateKnowledgeBaseInput,
  ): Promise<KnowledgeBaseDocument> {
    return KnowledgeBaseModel.create({
      userId: new mongoose.Types.ObjectId(input.userId),
      knowledgeBaseId: input.knowledgeBaseId,
      source: "github",
      githubRepoId: input.githubRepoId,
      owner: input.owner,
      repo: input.repo,
      fullName: input.fullName,
      defaultBranch: input.defaultBranch,
      htmlUrl: input.htmlUrl,
      status: input.status ?? "pending",
      fileCount: 0,
      chunkCount: 0,
      processedFiles: 0,
      totalFiles: 0,
    });
  }

  public async findByOwnerRepo(
    userId: string,
    owner: string,
    repo: string,
  ): Promise<KnowledgeBaseDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return KnowledgeBaseModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      owner: owner.toLowerCase(),
      repo,
    }).exec();
  }

  public async findByGithubRepoId(
    userId: string,
    githubRepoId: string,
  ): Promise<KnowledgeBaseDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return KnowledgeBaseModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      githubRepoId,
    }).exec();
  }

  public async findByKnowledgeBaseId(
    knowledgeBaseId: string,
  ): Promise<KnowledgeBaseDocument | null> {
    return KnowledgeBaseModel.findOne({ knowledgeBaseId }).exec();
  }

  public async listByUserId(userId: string): Promise<KnowledgeBaseDocument[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return [];
    }

    return KnowledgeBaseModel.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ updatedAt: -1 })
      .exec();
  }

  public async updateStatus(
    knowledgeBaseId: string,
    userId: string,
    update: {
      status: KnowledgeBaseStatus;
      errorMessage?: string | null;
      fileCount?: number;
      chunkCount?: number;
      processedFiles?: number;
      totalFiles?: number;
      defaultBranch?: string;
      lastSyncedAt?: Date | null;
    },
  ): Promise<KnowledgeBaseDocument | null> {
    const $set: Record<string, unknown> = {
      status: update.status,
    };

    if (update.fileCount !== undefined) {
      $set.fileCount = update.fileCount;
    }
    if (update.chunkCount !== undefined) {
      $set.chunkCount = update.chunkCount;
    }
    if (update.processedFiles !== undefined) {
      $set.processedFiles = update.processedFiles;
    }
    if (update.totalFiles !== undefined) {
      $set.totalFiles = update.totalFiles;
    }
    if (update.defaultBranch !== undefined) {
      $set.defaultBranch = update.defaultBranch;
    }
    if (update.lastSyncedAt !== undefined && update.lastSyncedAt !== null) {
      $set.lastSyncedAt = update.lastSyncedAt;
    }

    const $unset: Record<string, 1> = {};
    if (update.errorMessage === null) {
      $unset.errorMessage = 1;
    } else if (update.errorMessage !== undefined) {
      $set.errorMessage = update.errorMessage;
    }

    return KnowledgeBaseModel.findOneAndUpdate(
      {
        knowledgeBaseId,
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        $set,
        ...(Object.keys($unset).length ? { $unset } : {}),
      },
      { new: true },
    ).exec();
  }

  public async updateProgress(
    knowledgeBaseId: string,
    progress: {
      processedFiles: number;
      totalFiles: number;
      chunkCount?: number;
    },
  ): Promise<void> {
    await KnowledgeBaseModel.updateOne(
      { knowledgeBaseId },
      {
        $set: {
          processedFiles: progress.processedFiles,
          totalFiles: progress.totalFiles,
          ...(progress.chunkCount !== undefined
            ? { chunkCount: progress.chunkCount }
            : {}),
        },
      },
    ).exec();
  }
}
