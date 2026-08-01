import type { Router } from "express";

import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { GithubController } from "./github.controller.js";
import { GithubRepository } from "./github.repository.js";
import { createGithubRoutes } from "./github.router.js";
import { GithubService } from "./github.service.js";

export function createGithubModule(
  auth: AuthMiddleware,
  repository: GithubRepository = new GithubRepository(),
): {
  router: Router;
  controller: GithubController;
  service: GithubService;
} {
  const service = new GithubService(repository);
  const controller = new GithubController(service);
  const router = createGithubRoutes(controller, auth);

  return { router, controller, service };
}
