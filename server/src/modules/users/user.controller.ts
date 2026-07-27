import type { RequestHandler } from "express";

import { AppError } from "../../shared/errors/AppError.js";
import { sendResponse } from "../../shared/utils/sendResponse.js";
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
} from "../../shared/utils/validatedRequest.js";
import type {
  CreateUserBody,
  ListUsersQuery,
  UpdateUserBody,
  UserIdParams,
} from "./user.schema.js";
import type { UserService } from "./user.service.js";

export class UserController {
  public constructor(private readonly service: UserService) {}

  public list: RequestHandler = async (request, response) => {
    const users = await this.service.list(
      getValidatedQuery<ListUsersQuery>(request),
    );
    return sendResponse(response, 200, users);
  };

  public getById: RequestHandler = async (request, response) => {
    const { id } = getValidatedParams<UserIdParams>(request);
    const user = await this.service.getById(id);
    return sendResponse(response, 200, user);
  };

  public create: RequestHandler = async (request, response) => {
    const user = await this.service.create(
      getValidatedBody<CreateUserBody>(request),
    );
    return sendResponse(response, 201, user, "User created successfully.");
  };

  public update: RequestHandler = async (request, response) => {
    const { id } = getValidatedParams<UserIdParams>(request);
    const user = await this.service.update(
      id,
      getValidatedBody<UpdateUserBody>(request),
    );
    return sendResponse(response, 200, user, "User updated successfully.");
  };

  public delete: RequestHandler = async (request, response) => {
    const { id } = getValidatedParams<UserIdParams>(request);

    if (!request.user) {
      throw AppError.unauthorized();
    }

    await this.service.delete(id, request.user.id);
    return response.status(204).send();
  };
}
