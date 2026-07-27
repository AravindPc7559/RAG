import type { UserRepository } from "../users/user.repository.js";
import { AuthController } from "./auth.controller.js";
import { AuthMiddleware } from "./auth.middleware.js";
import { createAuthRoutes } from "./auth.routes.js";
import { AuthService } from "./auth.service.js";

export function createAuthModule(userRepository: UserRepository) {
  const service = new AuthService(userRepository);
  const controller = new AuthController(service);
  const middleware = new AuthMiddleware(service);
  const router = createAuthRoutes(controller, middleware);

  return {
    service,
    controller,
    middleware,
    router,
  };
}
