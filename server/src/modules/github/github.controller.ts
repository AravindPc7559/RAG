import type { RequestHandler } from "express";

import { AppError } from "../../shared/errors/AppError.js";
import {
  readQueryValue,
  readStringParam,
} from "../../shared/utils/requestParams.js";
import { GITHUB_OAUTH_NONCE_COOKIE } from "./github.oauth.js";
import type { GithubService } from "./github.service.js";
import { parseListRepositoriesQuery } from "./github.utils.js";

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

    const query = parseListRepositoriesQuery(
      request.query as Record<string, unknown>,
      readQueryValue,
    );
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
}
