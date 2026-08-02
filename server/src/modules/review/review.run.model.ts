import mongoose, {
  type HydratedDocument,
  type Model,
  Schema,
} from "mongoose";

import type { ReviewCommentSeverity } from "./review.types.js";

export type ReviewRunSource = "manual" | "auto";
export type ReviewRunStatus =
  | "generated"
  | "published"
  | "no_comments"
  | "failed";

export interface ReviewRunCommentEntity {
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
  severity: ReviewCommentSeverity;
  body: string;
}

export interface ReviewRunSeverityCounts {
  info: number;
  warning: number;
  important: number;
}

export interface ReviewRunEntity {
  runId: string;
  userId: mongoose.Types.ObjectId;
  knowledgeBaseId: string;
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
  prTitle: string;
  source: ReviewRunSource;
  status: ReviewRunStatus;
  jobId?: string;
  githubReviewId?: number;
  htmlUrl?: string;
  githubState?: string;
  publishedCount: number;
  comments: ReviewRunCommentEntity[];
  analyzedFiles: string[];
  skippedFiles: string[];
  summaryBody?: string;
  errorMessage?: string;
  severityCounts: ReviewRunSeverityCounts;
  finishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewRunDocument = HydratedDocument<ReviewRunEntity>;

const reviewRunCommentSchema = new Schema<ReviewRunCommentEntity>(
  {
    path: { type: String, required: true, trim: true },
    line: { type: Number, required: true, min: 1 },
    side: { type: String, enum: ["LEFT", "RIGHT"], required: true },
    severity: {
      type: String,
      enum: ["info", "warning", "important"],
      required: true,
    },
    body: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const reviewRunSchema = new Schema<ReviewRunEntity>(
  {
    runId: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    knowledgeBaseId: { type: String, required: true, index: true },
    owner: { type: String, required: true, trim: true, lowercase: true },
    repo: { type: String, required: true, trim: true },
    prNumber: { type: Number, required: true, min: 1 },
    headSha: { type: String, required: true, trim: true },
    prTitle: { type: String, required: true, trim: true, default: "" },
    source: {
      type: String,
      enum: ["manual", "auto"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["generated", "published", "no_comments", "failed"],
      required: true,
      index: true,
    },
    jobId: { type: String, trim: true },
    githubReviewId: { type: Number },
    htmlUrl: { type: String, trim: true },
    githubState: { type: String, trim: true },
    publishedCount: { type: Number, required: true, default: 0, min: 0 },
    comments: { type: [reviewRunCommentSchema], required: true, default: [] },
    analyzedFiles: { type: [String], required: true, default: [] },
    skippedFiles: { type: [String], required: true, default: [] },
    summaryBody: { type: String, trim: true },
    errorMessage: { type: String, trim: true },
    severityCounts: {
      info: { type: Number, required: true, default: 0, min: 0 },
      warning: { type: Number, required: true, default: 0, min: 0 },
      important: { type: Number, required: true, default: 0, min: 0 },
    },
    finishedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true, versionKey: false },
);

reviewRunSchema.index(
  { userId: 1, createdAt: -1 },
  { name: "review_run_user_created" },
);
reviewRunSchema.index(
  { userId: 1, owner: 1, repo: 1, createdAt: -1 },
  { name: "review_run_user_repo_created" },
);

export const ReviewRunModel: Model<ReviewRunEntity> =
  mongoose.models.ReviewRun ??
  mongoose.model<ReviewRunEntity>("ReviewRun", reviewRunSchema);
