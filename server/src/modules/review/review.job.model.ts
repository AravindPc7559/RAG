import mongoose, {
  type HydratedDocument,
  type Model,
  Schema,
} from "mongoose";

export type ReviewJobStatus = "queued" | "active" | "done" | "failed";

export interface ReviewJobEntity {
  jobId: string;
  status: ReviewJobStatus;
  userId: mongoose.Types.ObjectId;
  knowledgeBaseId: string;
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
  deliveryId?: string;
  action: string;
  attempts: number;
  errorMessage?: string;
  lockedAt?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewJobDocument = HydratedDocument<ReviewJobEntity>;

const reviewJobSchema = new Schema<ReviewJobEntity>(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "active", "done", "failed"],
      required: true,
      default: "queued",
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    knowledgeBaseId: {
      type: String,
      required: true,
      index: true,
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
    prNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    headSha: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryId: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    lockedAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

reviewJobSchema.index(
  { status: 1, createdAt: 1 },
  { name: "review_job_queue" },
);

reviewJobSchema.index(
  { knowledgeBaseId: 1, prNumber: 1, headSha: 1 },
  { unique: true, name: "review_job_idempotency" },
);

export const ReviewJobModel: Model<ReviewJobEntity> =
  mongoose.models.ReviewJob ??
  mongoose.model<ReviewJobEntity>("ReviewJob", reviewJobSchema);
