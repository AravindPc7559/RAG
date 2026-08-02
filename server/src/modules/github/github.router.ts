import { Router } from "express";

import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import type { GithubController } from "./github.controller.js";

export function createGithubRoutes(
  controller: GithubController,
  auth: AuthMiddleware,
) {
  const router = Router();

  // OAuth callback is bound to signed state + nonce cookie (not JWT session).
  router.get("/callback", asyncHandler(controller.callback));

  router.use(asyncHandler(auth.authenticate));

  router.get("/login", asyncHandler(controller.login));
  router.get("/status", asyncHandler(controller.getStatus));
  router.get("/repos", asyncHandler(controller.listRepositories));
  router.get("/repos/:owner/:repo", asyncHandler(controller.getRepository));
  router.get(
    "/repos/:owner/:repo/branches",
    asyncHandler(controller.listBranches),
  );
  router.delete("/disconnect", asyncHandler(controller.disconnect));
  router.post("/refresh-profile", asyncHandler(controller.refreshProfile));

  return router;
}
