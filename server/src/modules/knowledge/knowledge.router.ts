import { Router } from "express";

import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import type { KnowledgeController } from "./knowledge.controller.js";

export function createKnowledgeRoutes(
  controller: KnowledgeController,
  auth: AuthMiddleware,
) {
  const router = Router();

  router.use(asyncHandler(auth.authenticate));

  router.get("/", asyncHandler(controller.listKnowledgeBases));
  router.get(
    "/github/:owner/:repo",
    asyncHandler(controller.getKnowledgeBase),
  );
  router.post(
    "/github/:owner/:repo/import",
    asyncHandler(controller.importRepository),
  );
  router.post(
    "/github/:owner/:repo/sync",
    asyncHandler(controller.syncRepository),
  );

  return router;
}
