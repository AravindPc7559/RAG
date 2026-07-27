import type { RequestHandler } from "express";

import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { UserRole } from "../users/user.types.js";
import type { AuthService } from "./auth.service.js";

export class AuthMiddleware {
  public constructor(private readonly authService: AuthService) {}

  public authenticate: RequestHandler = async (request, _response, next) => {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[env.JWT_COOKIE_NAME];

    if (typeof token !== "string" || !token) {
      return next(AppError.unauthorized());
    }

    try {
      request.user = await this.authService.validateSession(token);
      return next();
    } catch (error) {
      return next(error);
    }
  };

  public authorize =
    (...allowedRoles: UserRole[]): RequestHandler =>
    (request, _response, next) => {
      if (!request.user) {
        return next(AppError.unauthorized());
      }

      if (!allowedRoles.includes(request.user.role)) {
        return next(AppError.forbidden());
      }

      return next();
    };
}
