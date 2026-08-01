import mongoose from "mongoose";
import OpenAI from "openai";

import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import { DocumentModel } from "./document.model.js";

export interface DocumentChunkInput {
  userId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  chunkIndex: number;
  embedding: number[];
  text: string;
}

export class DocumentRepository {
  private openAIClient: OpenAI | null = null;

  public async createEmbedding(text: string): Promise<number[]> {
    const response = await this.getOpenAIClient().embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: text,
    });

    return response.data[0]?.embedding ?? [];
  }

  public async createDocumentChunks(
    chunks: DocumentChunkInput[],
  ): Promise<number> {
    if (!chunks.length) {
      return 0;
    }

    const documents = chunks.map((chunk) => ({
      ...chunk,
      userId: new mongoose.Types.ObjectId(chunk.userId),
    }));
    const created = await DocumentModel.insertMany(documents);

    return created.length;
  }

  public async deleteDocumentChunks(
    documentId: string,
    userId: string,
  ): Promise<void> {
    await DocumentModel.deleteMany({
      documentId,
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  private getOpenAIClient() {
    if (!env.OPENAI_API_KEY) {
      throw AppError.serviceUnavailable(
        "OPENAI_API_KEY is required for document embeddings. Add it to server/.env.",
      );
    }

    this.openAIClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
    return this.openAIClient;
  }
}
