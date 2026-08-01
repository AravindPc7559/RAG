import type { Router } from "express";

import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { ChatController } from "./chat.controller.js";
import { ChatRepository } from "./chat.repository.js";
import { createChatRoutes } from "./chat.router.js";
import { ChatService } from "./chat.service.js";

export function createChatModule(
  auth: AuthMiddleware,
  repository: ChatRepository = new ChatRepository(),
): {
  router: Router;
  controller: ChatController;
  service: ChatService;
  repository: ChatRepository;
} {
  const service = new ChatService(repository);
  const controller = new ChatController(service);
  const router = createChatRoutes(controller, auth);

  return { router, controller, service, repository };
}
