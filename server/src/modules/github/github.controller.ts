import type { RequestHandler } from "express";

import { AppError } from "../../shared/errors/AppError.js";
import { GITHUB_OAUTH_NONCE_COOKIE } from "./github.oauth.js";
import type { GithubService } from "./github.service.js";
import type { ListGithubRepositoriesQuery } from "./github.types.js";

function readStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

function readQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return readStringParam(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return readStringParam(value[0]);
  }

  return undefined;
}

export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  public login: RequestHandler = (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const authorizeUrl = this.githubService.beginLogin(userId, response);
    response.redirect(302, authorizeUrl);
  };

  public callback: RequestHandler = async (request, response) => {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const nonceCookie = cookies?.[GITHUB_OAUTH_NONCE_COOKIE];

    const redirectUrl = await this.githubService.handleCallback({
      code: readStringParam(request.query.code as string | undefined),
      state: readStringParam(request.query.state as string | undefined),
      error: readStringParam(request.query.error as string | undefined),
      errorDescription: readStringParam(
        request.query.error_description as string | undefined,
      ),
      nonceCookie: typeof nonceCookie === "string" ? nonceCookie : undefined,
      response,
    });

    response.redirect(302, redirectUrl);
  };

  public getStatus: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const status = await this.githubService.getStatus(userId);

    response.status(200).json({
      message: "GitHub status fetched successfully",
      status,
    });
  };

  public listRepositories: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const query = this.parseListQuery(request.query);
    const result = await this.githubService.getRepositories(userId, query);

    response.status(200).json({
      message: "GitHub repositories fetched successfully",
      ...result,
    });
  };

  public getRepository: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const owner = readStringParam(request.params.owner);
    const repo = readStringParam(request.params.repo);

    if (!owner || !repo) {
      throw AppError.badRequest("Repository owner and name are required.");
    }

    const repository = await this.githubService.getRepository(
      userId,
      owner,
      repo,
    );

    response.status(200).json({
      message: "GitHub repository fetched successfully",
      repository,
    });
  };

  public disconnect: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const status = await this.githubService.disconnect(userId);

    response.status(200).json({
      message: "GitHub disconnected successfully",
      status,
    });
  };

  public refreshProfile: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const status = await this.githubService.refreshProfile(userId);

    response.status(200).json({
      message: "GitHub profile refreshed successfully",
      status,
    });
  };

  private parseListQuery(
    query: Record<string, unknown>,
  ): ListGithubRepositoriesQuery {
    const page = Number.parseInt(readQueryValue(query.page) ?? "", 10);
    const perPage = Number.parseInt(readQueryValue(query.perPage) ?? "", 10);
    const sort = readQueryValue(query.sort);
    const direction = readQueryValue(query.direction);
    const visibility = readQueryValue(query.visibility);
    const search = readQueryValue(query.search);

    const allowedSort = ["created", "updated", "pushed", "full_name"] as const;
    const allowedDirection = ["asc", "desc"] as const;
    const allowedVisibility = ["all", "public", "private"] as const;

    return {
      ...(Number.isFinite(page) && page > 0 ? { page } : {}),
      ...(Number.isFinite(perPage) && perPage > 0 ? { perPage } : {}),
      ...(sort &&
      allowedSort.includes(sort as (typeof allowedSort)[number])
        ? { sort: sort as (typeof allowedSort)[number] }
        : {}),
      ...(direction &&
      allowedDirection.includes(direction as (typeof allowedDirection)[number])
        ? { direction: direction as (typeof allowedDirection)[number] }
        : {}),
      ...(visibility &&
      allowedVisibility.includes(
        visibility as (typeof allowedVisibility)[number],
      )
        ? { visibility: visibility as (typeof allowedVisibility)[number] }
        : {}),
      ...(search ? { search } : {}),
    };
  }
}
