import mongoose, {
  type HydratedDocument,
  type Model,
  Schema,
} from "mongoose";

import type { KnowledgeBaseStatus } from "./knowledge.types.js";

export interface KnowledgeBaseEntity {
  userId: mongoose.Types.ObjectId;
  knowledgeBaseId: string;
  source: "github";
  githubRepoId: string;
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  htmlUrl: string;
  status: KnowledgeBaseStatus;
  errorMessage?: string;
  fileCount: number;
  chunkCount: number;
  processedFiles: number;
  totalFiles: number;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type KnowledgeBaseDocument = HydratedDocument<KnowledgeBaseEntity>;

const knowledgeBaseSchema = new Schema<KnowledgeBaseEntity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    knowledgeBaseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["github"],
      required: true,
      default: "github",
    },
    githubRepoId: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: String,
      required: true,
      trim: true,
    },
    repo: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    defaultBranch: {
      type: String,
      required: true,
      trim: true,
    },
    htmlUrl: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "indexing", "ready", "failed"],
      required: true,
      default: "pending",
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    fileCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    chunkCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    processedFiles: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalFiles: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastSyncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

knowledgeBaseSchema.index(
  { userId: 1, githubRepoId: 1 },
  { unique: true, name: "knowledge_user_github_repo" },
);

knowledgeBaseSchema.index(
  { userId: 1, owner: 1, repo: 1 },
  { unique: true, name: "knowledge_user_owner_repo" },
);

export const KnowledgeBaseModel: Model<KnowledgeBaseEntity> =
  mongoose.models.KnowledgeBase ??
  mongoose.model<KnowledgeBaseEntity>("KnowledgeBase", knowledgeBaseSchema);
