import mongoose, {
  type HydratedDocument,
  type Model,
  Schema,
} from "mongoose";

export interface GithubConnectionEntity {
  userId: mongoose.Types.ObjectId;
  githubConnected: boolean;
  githubId?: string;
  githubUsername?: string;
  githubName?: string;
  githubAvatar?: string;
  githubAccessToken?: string;
  githubRefreshToken?: string;
  githubTokenType?: string;
  githubScope?: string;
  githubConnectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type GithubConnectionDocument = HydratedDocument<GithubConnectionEntity>;

const githubConnectionSchema = new Schema<GithubConnectionEntity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    githubConnected: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    githubId: {
      type: String,
      trim: true,
      index: true,
    },
    githubUsername: {
      type: String,
      trim: true,
    },
    githubName: {
      type: String,
      trim: true,
    },
    githubAvatar: {
      type: String,
      trim: true,
    },
    githubAccessToken: {
      type: String,
      select: false,
    },
    githubRefreshToken: {
      type: String,
      select: false,
    },
    githubTokenType: {
      type: String,
      trim: true,
    },
    githubScope: {
      type: String,
      trim: true,
    },
    githubConnectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const GithubConnectionModel: Model<GithubConnectionEntity> =
  mongoose.models.GithubConnection ??
  mongoose.model<GithubConnectionEntity>(
    "GithubConnection",
    githubConnectionSchema,
  );
