import mongoose, {
  type HydratedDocument,
  type Model,
  Schema,
  type Types,
} from "mongoose";

export type ChatEntity = {
  id: string;
  question: string;
  answer: string;
  userId?: Types.ObjectId;
  documentId?: string;
  createdAt: Date;
  updatedAt?: Date;
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
    documentId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

chatSchema.index({ userId: 1, documentId: 1, createdAt: -1 });

export const ChatModel: Model<ChatEntity> =
  mongoose.models.Chat ?? mongoose.model<ChatEntity>("Chat", chatSchema);
