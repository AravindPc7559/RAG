import mongoose, { Mongoose } from "mongoose";
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

interface SearchResult {
  text: string;
  score: number;
}

export class DocumentRepository {
  private openAIClient: OpenAI | null = null;

  public async keywordSearch(question: string, userId: string){
    const response = await DocumentModel.find({
      userId: new mongoose.Types.ObjectId(userId)
    })
  }

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

  public async askDocument(
    question: string,
    userId: string,
    documentId?: string,
  ): Promise<string | null> {
    const queryVector = await this.createEmbedding(question);
    if (!queryVector.length) {
      return null;
    }

    const results =
      env.VECTOR_SEARCH_MODE === "mongodb"
        ? await this.mongodbVectorSearch(queryVector, userId, documentId)
        : await this.localVectorSearch(queryVector, userId, documentId);
    
    const answerCollection = results.length
      ? results.map((result) => result.text).join("\n\n")
      : "";

    const output = await this.getProperAnswer(question, answerCollection)

    return output || null;
  }

  private async getProperAnswer(question: string, answers: string) {
    if (question?.length && answers?.length) {
      const openAI = this.getOpenAIClient();
      const bestResult = await openAI.responses.create({
        model: "gpt-5",
        input: [
          {
            role: "system",
            content: `
You are a helpful assistant.

Answer the user's question using only the provided context.
If the answer is not present in the context, reply:
"I couldn't find that information in the provided documents."

Be concise and accurate.
      `,
          },
          {
            role: "user",
            content: `
Context:
${answers}

Question:
${question}
      `,
          },
        ],
      });

      return bestResult?.output_text;
    }
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

  private async localVectorSearch(
    queryVector: number[],
    userId: string,
    documentId?: string,
  ): Promise<SearchResult[]> {
    const candidates = await DocumentModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      ...(documentId ? { documentId } : {}),
    })
      .select({ text: 1, embedding: 1 })
      .lean();

    return candidates
      .map((candidate) => ({
        text: candidate.text,
        score: cosineSimilarity(queryVector, candidate.embedding),
      }))
      .filter((candidate) => candidate.score >= env.VECTOR_SEARCH_MIN_SCORE)
      .sort((left, right) => right.score - left.score)
      .slice(0, env.VECTOR_SEARCH_LIMIT);
  }

  private async mongodbVectorSearch(
    queryVector: number[],
    userId: string,
    documentId?: string,
  ): Promise<SearchResult[]> {
    return DocumentModel.aggregate<SearchResult>([
      {
        $vectorSearch: {
          index: env.VECTOR_SEARCH_INDEX,
          path: "embedding",
          queryVector,
          numCandidates: Math.max(env.VECTOR_SEARCH_LIMIT * 20, 100),
          limit: env.VECTOR_SEARCH_LIMIT,
          filter: {
            userId: new mongoose.Types.ObjectId(userId),
            ...(documentId ? { documentId } : {}),
          },
        },
      },
      {
        $project: {
          _id: 0,
          text: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
      {
        $match: {
          score: { $gte: env.VECTOR_SEARCH_MIN_SCORE },
        },
      },
    ]);
  }
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) {
    return -1;
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? -1 : dotProduct / denominator;
}
