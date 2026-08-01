import type { Router } from "express";

import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { ChatRepository } from "../chat/chat.repository.js";
import type { GithubService } from "../github/github.service.js";
import { KnowledgeRepository } from "../knowledge/knowledge.repository.js";
import {
  createGithubPrAdapter,
  createKnowledgeLookupAdapter,
  createRetrievalAdapter,
} from "./review.adapters.js";
import { ReviewController } from "./review.controller.js";
import { createReviewRoutes } from "./review.router.js";
import { ReviewService } from "./review.service.js";

export function createReviewModule(
  auth: AuthMiddleware,
  githubService: GithubService,
  chatRepository: ChatRepository = new ChatRepository(),
  knowledgeRepository: KnowledgeRepository = new KnowledgeRepository(),
): {
  router: Router;
  controller: ReviewController;
  service: ReviewService;
} {
  const service = new ReviewService(
    createGithubPrAdapter(githubService),
    createKnowledgeLookupAdapter(knowledgeRepository),
    createRetrievalAdapter(chatRepository),
  );
  const controller = new ReviewController(service);
  const router = createReviewRoutes(controller, auth);

  return { router, controller, service };
}
