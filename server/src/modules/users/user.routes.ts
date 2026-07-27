import { Router } from "express";

import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { validateRequest } from "../../shared/middleware/validateRequest.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import type { UserController } from "./user.controller.js";
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from "./user.schema.js";

export function createUserRoutes(
  controller: UserController,
  auth: AuthMiddleware,
) {
  const router = Router();

  router.use(asyncHandler(auth.authenticate));

  router.get(
    "/",
    validateRequest({ query: listUsersQuerySchema }),
    asyncHandler(controller.list),
  );
  router.get(
    "/:id",
    validateRequest({ params: userIdParamsSchema }),
    asyncHandler(controller.getById),
  );
  router.post(
    "/",
    auth.authorize("admin"),
    validateRequest({ body: createUserBodySchema }),
    asyncHandler(controller.create),
  );
  router.patch(
    "/:id",
    auth.authorize("admin"),
    validateRequest({
      params: userIdParamsSchema,
      body: updateUserBodySchema,
    }),
    asyncHandler(controller.update),
  );
  router.delete(
    "/:id",
    auth.authorize("admin"),
    validateRequest({ params: userIdParamsSchema }),
    asyncHandler(controller.delete),
  );

  return router;
}
