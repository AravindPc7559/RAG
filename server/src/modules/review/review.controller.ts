import type { RequestHandler } from "express";

import { AppError } from "../../shared/errors/AppError.js";
import {
  readPositiveIntParam,
  readStringParam,
} from "../../shared/utils/requestParams.js";
import type { ReviewService } from "./review.service.js";
import type { PublishReviewCommentInput } from "./review.types.js";
import { readPullRequestState } from "./review.utils.js";

export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  public listPullRequests: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const owner = readStringParam(request.params.owner);
    const repo = readStringParam(request.params.repo);
    if (!owner || !repo) {
      throw AppError.badRequest("Repository owner and name are required.");
    }

    const page = Number(request.query.page);
    const perPage = Number(request.query.perPage);

    const result = await this.reviewService.listPullRequests(
      userId,
      owner,
      repo,
      {
        state: readPullRequestState(request.query.state),
        ...(Number.isInteger(page) && page > 0 ? { page } : {}),
        ...(Number.isInteger(perPage) && perPage > 0 ? { perPage } : {}),
      },
    );

    response.status(200).json({
      message: "Pull requests fetched successfully",
      ...result,
    });
  };

  public getPullRequest: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const owner = readStringParam(request.params.owner);
    const repo = readStringParam(request.params.repo);
    const number = readPositiveIntParam(request.params.number);
    if (!owner || !repo || number === null) {
      throw AppError.badRequest("Repository and pull request number are required.");
    }

    const detail = await this.reviewService.getPullRequestDetail(
      userId,
      owner,
      repo,
      number,
    );

    response.status(200).json({
      message: "Pull request fetched successfully",
      ...detail,
    });
  };

  public analyzePullRequest: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const owner = readStringParam(request.params.owner);
    const repo = readStringParam(request.params.repo);
    const number = readPositiveIntParam(request.params.number);
    if (!owner || !repo || number === null) {
      throw AppError.badRequest("Repository and pull request number are required.");
    }

    const result = await this.reviewService.analyzePullRequest(
      userId,
      owner,
      repo,
      number,
    );

    response.status(200).json({
      message: "Pull request analyzed successfully",
      ...result,
    });
  };

  public publishReview: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const owner = readStringParam(request.params.owner);
    const repo = readStringParam(request.params.repo);
    const number = readPositiveIntParam(request.params.number);
    if (!owner || !repo || number === null) {
      throw AppError.badRequest("Repository and pull request number are required.");
    }

    const body =
      typeof request.body?.body === "string" ? request.body.body : undefined;
    const comments = Array.isArray(request.body?.comments)
      ? (request.body.comments as PublishReviewCommentInput[])
      : [];

    const result = await this.reviewService.publishReview(
      userId,
      owner,
      repo,
      number,
      { body, comments },
    );

    response.status(200).json({
      message: "Review published successfully",
      ...result,
    });
  };
}
