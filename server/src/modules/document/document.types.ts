import type { Types } from "mongoose";

export type DocumentSourceType = "upload" | "github";

export interface IDocument {
  userId: Types.ObjectId;
  documentId: string;
  fileName: string;
  mimeType: string;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  sourceType?: DocumentSourceType;
  sourcePath?: string;
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
  publicId: string;
  url: string;
}
