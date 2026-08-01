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
}
