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

  public getChats: RequestHandler = async (request, response) => {
    const documentIdParam = request.params.documentId;
    const limit = Number.parseInt(String(request.query.limit ?? ""), 10) || 10;
    const beforeParam = request.query.before;
    const before =
      typeof beforeParam === "string" && beforeParam.trim()
        ? beforeParam.trim()
        : undefined;
    const userId = request.user?.id;
    const documentId =
      typeof documentIdParam === "string" ? documentIdParam.trim() : "";

    if (!documentId || !userId) {
      response
        .status(400)
        .json({ message: "No document id or user id provided" });
      return;
    }

    const chats = await this.chatService.getChats(
      documentId,
      limit,
      userId,
      before,
    );

    response.status(200).json({
      message: "Chats fetched successfully",
      chats,
      hasMore: chats.length === limit,
    });
  };
}
