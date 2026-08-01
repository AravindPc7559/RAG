import { Router } from "express";

import { createAuthModule } from "../modules/auth/auth.module.js";
import { createChatModule } from "../modules/chat/chat.modules.js";
import type { ChatRepository } from "../modules/chat/chat.repository.js";
import { createDocumentModule } from "../modules/document/document.modules.js";
import type { DocumentRepository } from "../modules/document/document.repository.js";
import { createHealthRoutes } from "../modules/health/health.routes.js";
import { createUserModule } from "../modules/users/user.module.js";
import type { UserRepository } from "../modules/users/user.repository.js";
import { createUserRoutes } from "../modules/users/user.routes.js";

export interface ApiDependencies {
  userRepository?: UserRepository;
  documentRepository?: DocumentRepository;
  chatRepository?: ChatRepository;
}

export function createApiRouter(dependencies: ApiDependencies = {}) {
  const router = Router();
  const users = createUserModule(dependencies.userRepository);
  const auth = createAuthModule(users.repository);
  const document = createDocumentModule(
    auth.middleware,
    dependencies.documentRepository,
  );
  const chat = createChatModule(auth.middleware, dependencies.chatRepository);

  router.use("/health", createHealthRoutes());
  router.use("/auth", auth.router);
  router.use("/users", createUserRoutes(users.controller, auth.middleware));
  router.use("/document", document.router);
  router.use("/chat", chat.router);

  return router;
}
