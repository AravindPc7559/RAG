import mongoose, {
  type HydratedDocument,
  type Model,
  Schema,
} from "mongoose";

export type KnowledgeJobType = "import" | "sync";
export type KnowledgeJobStatus = "queued" | "active" | "done" | "failed";

export interface KnowledgeJobEntity {
  jobId: string;
  type: KnowledgeJobType;
  status: KnowledgeJobStatus;
  userId: mongoose.Types.ObjectId;
  knowledgeBaseId: string;
  owner: string;
  repo: string;
  githubOwner: string;
  githubRepo: string;
  defaultBranch: string;
  fullName: string;
  attempts: number;
  errorMessage?: string;
  lockedAt?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type KnowledgeJobDocument = HydratedDocument<KnowledgeJobEntity>;

const knowledgeJobSchema = new Schema<KnowledgeJobEntity>(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["import", "sync"],
      required: true,
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
    githubOwner: {
      type: String,
      required: true,
      trim: true,
    },
    githubRepo: {
      type: String,
      required: true,
      trim: true,
    },
    defaultBranch: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
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

knowledgeJobSchema.index(
  { status: 1, createdAt: 1 },
  { name: "knowledge_job_queue" },
);

export const KnowledgeJobModel: Model<KnowledgeJobEntity> =
  mongoose.models.KnowledgeJob ??
  mongoose.model<KnowledgeJobEntity>("KnowledgeJob", knowledgeJobSchema);
