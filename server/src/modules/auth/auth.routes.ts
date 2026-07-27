import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { env } from "../../config/env.js";
import { validateRequest } from "../../shared/middleware/validateRequest.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import type { AuthController } from "./auth.controller.js";
import type { AuthMiddleware } from "./auth.middleware.js";
import { loginBodySchema, registerBodySchema } from "./auth.schema.js";

export function createAuthRoutes(
  controller: AuthController,
  middleware: AuthMiddleware,
) {
  const router = Router();
  const authRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  router.post(
    "/register",
    authRateLimiter,
    validateRequest({ body: registerBodySchema }),
    asyncHandler(controller.register),
  );
  router.post(
    "/login",
    authRateLimiter,
    validateRequest({ body: loginBodySchema }),
    asyncHandler(controller.login),
  );
  router.get(
    "/me",
    asyncHandler(middleware.authenticate),
    asyncHandler(controller.me),
  );
  router.post(
    "/logout",
    asyncHandler(middleware.authenticate),
    controller.logout,
  );

  return router;
}
