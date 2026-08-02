import mongoose, {
  type HydratedDocument,
  type Model,
  Schema,
} from "mongoose";

export interface AutoReviewConfigEntity {
  userId: mongoose.Types.ObjectId;
  knowledgeBaseId: string;
  githubRepoId: string;
  owner: string;
  repo: string;
  enabled: boolean;
  targetBranch: string;
  webhookId?: number;
  webhookActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AutoReviewConfigDocument = HydratedDocument<AutoReviewConfigEntity>;

const autoReviewConfigSchema = new Schema<AutoReviewConfigEntity>(
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
      index: true,
    },
    githubRepoId: {
      type: String,
      required: true,
      trim: true,
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
    enabled: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    targetBranch: {
      type: String,
      required: true,
      trim: true,
    },
    webhookId: {
      type: Number,
    },
    webhookActive: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

autoReviewConfigSchema.index(
  { userId: 1, githubRepoId: 1 },
  { unique: true, name: "auto_review_user_repo" },
);

autoReviewConfigSchema.index(
  { githubRepoId: 1, enabled: 1 },
  { name: "auto_review_webhook_lookup" },
);

export const AutoReviewConfigModel: Model<AutoReviewConfigEntity> =
  mongoose.models.AutoReviewConfig ??
  mongoose.model<AutoReviewConfigEntity>(
    "AutoReviewConfig",
    autoReviewConfigSchema,
  );
