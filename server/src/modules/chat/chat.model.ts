import mongoose, {
  type HydratedDocument,
  type Model,
  Schema,
  type Types,
} from "mongoose";

export interface ChatEntity {
  question: string;
  answer: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatDocument = HydratedDocument<ChatEntity>;

const chatSchema = new Schema<ChatEntity>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const ChatModel: Model<ChatEntity> =
  mongoose.models.Chat ?? mongoose.model<ChatEntity>("Chat", chatSchema);
