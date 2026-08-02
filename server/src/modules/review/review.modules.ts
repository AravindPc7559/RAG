import type { Router } from "express";

import { env } from "../../config/env.js";
import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { ChatRepository } from "../chat/chat.repository.js";
import type { GithubService } from "../github/github.service.js";
import { KnowledgeRepository } from "../knowledge/knowledge.repository.js";
import { AutoReviewConfigRepository } from "./review.auto-config.repository.js";
import {
  createGithubPrAdapter,
  createKnowledgeLookupAdapter,
  createRetrievalAdapter,
} from "./review.adapters.js";
import { ReviewController } from "./review.controller.js";
import { ReviewJobRepository } from "./review.job.repository.js";
import { createReviewRoutes } from "./review.router.js";
import { ReviewService } from "./review.service.js";
import { ReviewWorker } from "./review.worker.js";

export function createReviewModule(
  auth: AuthMiddleware,
  githubService: GithubService,
  chatRepository: ChatRepository = new ChatRepository(),
  knowledgeRepository: KnowledgeRepository = new KnowledgeRepository(),
  autoReviewConfigRepository: AutoReviewConfigRepository = new AutoReviewConfigRepository(),
  reviewJobRepository: ReviewJobRepository = new ReviewJobRepository(),
): {
  router: Router;
  controller: ReviewController;
  service: ReviewService;
  jobRepository: ReviewJobRepository;
  worker: ReviewWorker;
} {
  const service = new ReviewService(
    createGithubPrAdapter(githubService),
    createKnowledgeLookupAdapter(knowledgeRepository),
    createRetrievalAdapter(chatRepository),
    autoReviewConfigRepository,
    reviewJobRepository,
  );
  const controller = new ReviewController(service);
  const router = createReviewRoutes(controller, auth);
  const worker = new ReviewWorker(
    service,
    reviewJobRepository,
    env.REVIEW_WORKER_POLL_MS,
  );

  return {
    router,
    controller,
    service,
    jobRepository: reviewJobRepository,
    worker,
  };
}
