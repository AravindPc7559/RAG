import { Router } from "express";

import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import type { ChatController } from "./chat.controller.js";

export function createChatRoutes(
  controller: ChatController,
  auth: AuthMiddleware,
) {
  const router = Router();

  router.use(asyncHandler(auth.authenticate));

  router.post(
    "/ask_document/:documentId",
    asyncHandler(controller.askDocument),
  );

  router.get(
    "/chats/:documentId", 
    asyncHandler(controller.getChats)
  )

  return router;
}
