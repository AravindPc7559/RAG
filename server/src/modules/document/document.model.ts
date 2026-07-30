import mongoose from "mongoose";

import type { IDocument } from "./document.types.js";

const documentSchema = new mongoose.Schema<IDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

documentSchema.index(
  { userId: 1, documentId: 1, chunkIndex: 1 },
  {
    unique: true,
    name: "document_chunk_identity",
  },
);

const existingDocumentModel = mongoose.models.Document as
  | mongoose.Model<IDocument>
  | undefined;

export const DocumentModel =
  existingDocumentModel ??
  mongoose.model<IDocument>("Document", documentSchema);
