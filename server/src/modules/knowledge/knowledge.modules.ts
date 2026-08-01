import type { Router } from "express";

import { env } from "../../config/env.js";
import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { DocumentRepository } from "../document/document.repository.js";
import { GithubRepository } from "../github/github.repository.js";
import { GithubService } from "../github/github.service.js";
import { createGithubContentAdapter } from "./githubContent.adapter.js";
import { KnowledgeController } from "./knowledge.controller.js";
import { KnowledgeJobRepository } from "./knowledge.job.repository.js";
import { KnowledgeRepository } from "./knowledge.repository.js";
import { createKnowledgeRoutes } from "./knowledge.router.js";
import { KnowledgeService } from "./knowledge.service.js";
import { KnowledgeWorker } from "./knowledge.worker.js";

export function createKnowledgeRuntime(
  githubService: GithubService = new GithubService(new GithubRepository()),
  documentRepository: DocumentRepository = new DocumentRepository(),
  knowledgeRepository: KnowledgeRepository = new KnowledgeRepository(),
  jobRepository: KnowledgeJobRepository = new KnowledgeJobRepository(),
) {
  const githubContent = createGithubContentAdapter(githubService);
  const service = new KnowledgeService(
    knowledgeRepository,
    documentRepository,
    githubContent,
    jobRepository,
  );

  return {
    service,
    knowledgeRepository,
    jobRepository,
    documentRepository,
    githubService,
  };
}

export function createKnowledgeModule(
  auth: AuthMiddleware,
  githubService: GithubService,
  documentRepository: DocumentRepository = new DocumentRepository(),
  knowledgeRepository: KnowledgeRepository = new KnowledgeRepository(),
  jobRepository: KnowledgeJobRepository = new KnowledgeJobRepository(),
): {
  router: Router;
  controller: KnowledgeController;
  service: KnowledgeService;
  jobRepository: KnowledgeJobRepository;
  worker: KnowledgeWorker;
} {
  const runtime = createKnowledgeRuntime(
    githubService,
    documentRepository,
    knowledgeRepository,
    jobRepository,
  );
  const controller = new KnowledgeController(runtime.service);
  const router = createKnowledgeRoutes(controller, auth);
  const worker = new KnowledgeWorker(
    runtime.service,
    runtime.jobRepository,
    env.KNOWLEDGE_WORKER_POLL_MS,
  );

  return {
    router,
    controller,
    service: runtime.service,
    jobRepository: runtime.jobRepository,
    worker,
  };
}
