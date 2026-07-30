import type { Router } from "express";

import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { DocumentController } from "./document.controller.js";
import { DocumentRepository } from "./document.repository.js";
import { createDocumentRoutes } from "./document.routes.js";
import { DocumentService } from "./document.service.js";

export const createDocumentModule = (
  auth: AuthMiddleware,
  repository: DocumentRepository = new DocumentRepository(),
): {
  router: Router;
  controller: DocumentController;
  service: DocumentService;
} => {
  const service = new DocumentService(repository);
  const controller = new DocumentController(service);
  const router = createDocumentRoutes(controller, auth);

  return { router, controller, service };
};
