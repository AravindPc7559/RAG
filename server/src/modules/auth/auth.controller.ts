import type { RequestHandler } from "express";

import { AppError } from "../../shared/errors/AppError.js";
import { sendResponse } from "../../shared/utils/sendResponse.js";
import { getValidatedBody } from "../../shared/utils/validatedRequest.js";
import { clearAuthCookie, setAuthCookie } from "./auth.cookies.js";
import type { LoginBody, RegisterBody } from "./auth.schema.js";
import type { AuthService } from "./auth.service.js";

export class AuthController {
  public constructor(private readonly service: AuthService) {}

  public register: RequestHandler = async (request, response) => {
    const result = await this.service.register(
      getValidatedBody<RegisterBody>(request),
    );
    setAuthCookie(response, result.token);
    return sendResponse(
      response,
      201,
      result.user,
      "Registered successfully.",
    );
  };

  public login: RequestHandler = async (request, response) => {
    const result = await this.service.login(
      getValidatedBody<LoginBody>(request),
    );
    setAuthCookie(response, result.token);
    return sendResponse(response, 200, result.user, "Signed in successfully.");
  };

  public me: RequestHandler = async (request, response) => {
    if (!request.user) {
      throw AppError.unauthorized();
    }

    const user = await this.service.getCurrentUser(request.user.id);
    return sendResponse(response, 200, user);
  };

  public logout: RequestHandler = (_request, response) => {
    clearAuthCookie(response);
    return sendResponse(response, 200, null, "Signed out successfully.");
  };
}
