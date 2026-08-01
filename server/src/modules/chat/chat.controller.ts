import type { RequestHandler } from "express";

import type { ChatService } from "./chat.service.js";

export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  public askDocument: RequestHandler = async (request, response) => {
    const { question } = request.body as {
      question?: string;
    };
    const documentIdParam = request.params.documentId;
    const documentId =
      typeof documentIdParam === "string" ? documentIdParam.trim() : "";
    const userId = request.user?.id;

    if (!question?.trim() || !documentId || !userId) {
      response
        .status(400)
        .json({ message: "No question, document id, or user id provided" });
      return;
    }

    const answer = await this.chatService.askDocument(
      question.trim(),
      userId,
      documentId,
    );

    response.status(200).json({
      message: "Document asked successfully",
      ...(answer ? { answer } : {}),
    });
  };
}
