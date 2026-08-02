import { Router } from "express";

import { createAuthModule } from "../modules/auth/auth.module.js";
import { createChatModule } from "../modules/chat/chat.modules.js";
import type { ChatRepository } from "../modules/chat/chat.repository.js";
import { createDocumentModule } from "../modules/document/document.modules.js";
import type { DocumentRepository } from "../modules/document/document.repository.js";
import { createGithubModule } from "../modules/github/github.modules.js";
import type { GithubRepository } from "../modules/github/github.repository.js";
import { createHealthRoutes } from "../modules/health/health.routes.js";
import { createKnowledgeModule } from "../modules/knowledge/knowledge.modules.js";
import type { KnowledgeWorker } from "../modules/knowledge/knowledge.worker.js";
import { createReviewModule } from "../modules/review/review.modules.js";
import type { ReviewWorker } from "../modules/review/review.worker.js";
import { createUserModule } from "../modules/users/user.module.js";
import type { UserRepository } from "../modules/users/user.repository.js";

export interface ApiDependencies {
  userRepository?: UserRepository;
  documentRepository?: DocumentRepository;
  chatRepository?: ChatRepository;
  githubRepository?: GithubRepository;
}

export function createApiRouter(dependencies: ApiDependencies = {}): {
  router: Router;
  knowledgeWorker: KnowledgeWorker;
  reviewWorker: ReviewWorker;
} {
  const router = Router();
  const users = createUserModule(dependencies.userRepository);
  const auth = createAuthModule(users.repository);
  const document = createDocumentModule(
    auth.middleware,
    dependencies.documentRepository,
  );
  const chat = createChatModule(auth.middleware, dependencies.chatRepository);
  const github = createGithubModule(
    auth.middleware,
    dependencies.githubRepository,
  );
  const knowledge = createKnowledgeModule(
    auth.middleware,
    github.service,
    dependencies.documentRepository,
  );
  const review = createReviewModule(
    auth.middleware,
    github.service,
    chat.repository,
  );

  router.use("/health", createHealthRoutes());
  router.use("/auth", auth.router);
  router.use("/document", document.router);
  router.use("/chat", chat.router);
  router.use("/github", github.router);
  router.use("/knowledge", knowledge.router);
  router.use("/review", review.router);

  return {
    router,
    knowledgeWorker: knowledge.worker,
    reviewWorker: review.worker,
  };
}
