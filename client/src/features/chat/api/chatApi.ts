import { baseService } from "@/services/baseService";
import { env } from "@/config/env";

export interface AskDocumentResponse {
  message: string;
  answer?: string;
}

export interface ChatEntity {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GetChatsResponse {
  message: string;
  chats: ChatEntity[];
  hasMore: boolean;
}

export const chatAPI = {
  async askDocument(question: string, documentId: string) {
    const response = await baseService.post<AskDocumentResponse>(
      `/chat/ask_document/${encodeURIComponent(documentId)}`,
      { question },
      { timeout: env.documentApiTimeoutMs },
    );

    return response.data;
  },

  async getChats(
    documentId: string,
    options: { limit: number; before?: string },
  ) {
    const response = await baseService.get<GetChatsResponse>(
      `/chat/chats/${encodeURIComponent(documentId)}`,
      {
        params: {
          limit: options.limit,
          ...(options.before ? { before: options.before } : {}),
        },
        timeout: env.documentApiTimeoutMs,
      },
    );

    return response.data;
  },
};
