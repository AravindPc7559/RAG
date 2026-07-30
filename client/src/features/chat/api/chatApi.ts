import { baseService } from "@/services/baseService";
import { env } from "@/config/env";

export interface AskDocumentResponse {
  message: string;
  answer?: string;
}

export const chatAPI = {
  async askDocument(question: string, documentId?: string) {
    const response = await baseService.post<AskDocumentResponse>(
      "/document/ask_document",
      { question, documentId },
      { timeout: env.documentApiTimeoutMs },
    );

    return response.data;
  },
};
