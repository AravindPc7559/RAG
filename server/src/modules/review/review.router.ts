import { Router } from "express";

import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import type { AuthMiddleware } from "../auth/auth.middleware.js";
import type { ReviewController } from "./review.controller.js";

export function createReviewRoutes(
  controller: ReviewController,
  auth: AuthMiddleware,
) {
  const router = Router();

  router.use(asyncHandler(auth.authenticate));

  router.get(
    "/github/:owner/:repo/pulls",
    asyncHandler(controller.listPullRequests),
  );
  router.get(
    "/github/:owner/:repo/pulls/:number",
    asyncHandler(controller.getPullRequest),
  );
  router.post(
    "/github/:owner/:repo/pulls/:number/analyze",
    asyncHandler(controller.analyzePullRequest),
  );
  router.post(
    "/github/:owner/:repo/pulls/:number/publish",
    asyncHandler(controller.publishReview),
  );

  return router;
}
