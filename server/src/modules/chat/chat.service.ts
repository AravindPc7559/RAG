import { ChatEntity } from "./chat.model.js";
import type { ChatRepository } from "./chat.repository.js";

export class ChatService {
  constructor(private readonly chatRepository: ChatRepository) {}

  public async askDocument(
    question: string,
    userId: string,
    documentId?: string,
  ): Promise<string | null> {
    return this.chatRepository.askDocument(question, userId, documentId);
  }

  public async getChats(
    documentId: string,
    limit: number,
    userId: string,
    before?: string,
  ): Promise<ChatEntity[]> {
    return this.chatRepository.getChats(documentId, limit, userId, before);
  }
}
