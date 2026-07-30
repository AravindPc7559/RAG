import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import {
  deleteDocumentFromCloudinary,
  uploadDocumentToCloudinary,
} from "../../shared/utils/cloudinaryStorage.js";
import { createTextChunks } from "../../shared/utils/createTextChunks.js";
import type {
  DocumentChunkInput,
  DocumentRepository,
} from "./document.repository.js";
import type { UploadedDocumentSummary } from "./document.types.js";
import { UserModel } from "../users/user.model.js";

export class DocumentService {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async uploadDocument(
    document: Express.Multer.File,
    userId: string,
  ): Promise<UploadedDocumentSummary | null> {
    const textChunks = await createTextChunks(document);
    if (!textChunks.length) {
      return null;
    }

    const documentId = randomUUID();
    const storedDocument = await uploadDocumentToCloudinary(document, userId);
    const chunks: DocumentChunkInput[] = [];

    try {
      for (const [chunkIndex, text] of textChunks.entries()) {
        const embedding =
          await this.documentRepository.createEmbedding(text);
        if (!embedding.length) {
          continue;
        }

        chunks.push({
          userId,
          documentId,
          fileName: document.originalname,
          mimeType: document.mimetype,
          cloudinaryPublicId: storedDocument.publicId,
          cloudinaryUrl: storedDocument.secureUrl,
          chunkIndex,
          embedding,
          text,
        });
      }

      const chunkCount =
        await this.documentRepository.createDocumentChunks(chunks);
      if (!chunkCount) {
        await deleteDocumentFromCloudinary(storedDocument.publicId);
        return null;
      }

      const userUpdate = await UserModel.updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        {
          $push: {
            documentUrls: {
              documentId,
              fileName: document.originalname,
              publicId: storedDocument.publicId,
              url: storedDocument.secureUrl,
            },
          },
        },
      );
      if (!userUpdate.matchedCount) {
        throw new Error("The document owner could not be updated.");
      }

      return {
        documentId,
        fileName: document.originalname,
        chunkCount,
        publicId: storedDocument.publicId,
        url: storedDocument.secureUrl,
      };
    } catch (error) {
      await this.documentRepository
        .deleteDocumentChunks(documentId, userId)
        .catch(() => undefined);
      await deleteDocumentFromCloudinary(storedDocument.publicId).catch(
        () => undefined,
      );
      throw error;
    }
  }

  public async askDocument(
    question: string,
    userId: string,
    documentId?: string,
  ): Promise<string | null> {
    return this.documentRepository.askDocument(
      question,
      userId,
      documentId,
    );
  }
}
