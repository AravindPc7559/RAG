import type { Types } from "mongoose";

export interface IDocument {
  userId: Types.ObjectId;
  documentId: string;
  fileName: string;
  mimeType: string;
  chunkIndex: number;
  embedding: number[];
  text: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UploadedDocumentSummary {
  documentId: string;
  fileName: string;
  chunkCount: number;
}
