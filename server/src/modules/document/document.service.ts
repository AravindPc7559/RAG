import { randomUUID } from "node:crypto";

import { createTextChunks } from "../../shared/utils/createTextChunks.js";
import type {
  DocumentChunkInput,
  DocumentRepository,
} from "./document.repository.js";
import type { UploadedDocumentSummary } from "./document.types.js";

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
    const chunks: DocumentChunkInput[] = [];

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
        chunkIndex,
        embedding,
        text,
      });
    }

    const chunkCount =
      await this.documentRepository.createDocumentChunks(chunks);
    if (!chunkCount) {
      return null;
    }

    return {
      documentId,
      fileName: document.originalname,
      chunkCount,
    };
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
