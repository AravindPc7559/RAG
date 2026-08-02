import type { RequestHandler } from "express";

import { AppError } from "../../shared/errors/AppError.js";
import {
  readHeaderValue,
  readPositiveIntParam,
  readStringParam,
} from "../../shared/utils/requestParams.js";
import type { ReviewService } from "./review.service.js";
import type {
  PublishReviewCommentInput,
  ReviewRunSource,
  ReviewRunStatus,
} from "./review.types.js";
import { readPullRequestState } from "./review.utils.js";

function readReviewSource(value: unknown): ReviewRunSource | undefined {
  if (value === "manual" || value === "auto") {
    return value;
  }
  return undefined;
}

function readReviewStatus(value: unknown): ReviewRunStatus | undefined {
  if (
    value === "generated" ||
    value === "published" ||
    value === "no_comments" ||
    value === "failed"
  ) {
    return value;
  }
  return undefined;
}

function requireUserId(userId: string | undefined): string {
  if (!userId) {
    throw AppError.unauthorized();
  }
  return userId;
}

function requireRepoParams(params: {
  owner?: string | string[];
  repo?: string | string[];
}): { owner: string; repo: string } {
  const owner = readStringParam(params.owner);
  const repo = readStringParam(params.repo);
  if (!owner || !repo) {
    throw AppError.badRequest("Repository owner and name are required.");
  }
  return { owner, repo };
}

function requirePullParams(params: {
  owner?: string | string[];
  repo?: string | string[];
  number?: string | string[];
}): { owner: string; repo: string; number: number } {
  const { owner, repo } = requireRepoParams(params);
  const number = readPositiveIntParam(params.number);
  if (number === null) {
    throw AppError.badRequest(
      "Repository and pull request number are required.",
    );
  }
  return { owner, repo, number };
}

export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  public listPullRequests: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const { owner, repo } = requireRepoParams(request.params);
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
    const userId = requireUserId(request.user?.id);
    const { owner, repo, number } = requirePullParams(request.params);

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
    const userId = requireUserId(request.user?.id);
    const { owner, repo, number } = requirePullParams(request.params);

    const result = await this.reviewService.analyzePullRequest(
      userId,
      owner,
      repo,
      number,
      { source: "manual", persist: true },
    );

    response.status(200).json({
      message: "Pull request analyzed successfully",
      ...result,
    });
  };

  public publishReview: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const { owner, repo, number } = requirePullParams(request.params);

    const body =
      typeof request.body?.body === "string" ? request.body.body : undefined;
    const comments = Array.isArray(request.body?.comments)
      ? (request.body.comments as PublishReviewCommentInput[])
      : [];
    const runId =
      typeof request.body?.runId === "string" ? request.body.runId : undefined;

    const result = await this.reviewService.publishReview(
      userId,
      owner,
      repo,
      number,
      { body, comments },
      { source: "manual", ...(runId ? { runId } : {}) },
    );

    response.status(200).json({
      message: "Review published successfully",
      ...result,
    });
  };

  public getAutoReview: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const { owner, repo } = requireRepoParams(request.params);

    const autoReview = await this.reviewService.getAutoReviewConfig(
      userId,
      owner,
      repo,
    );

    response.status(200).json({
      message: "Auto-review settings fetched successfully",
      autoReview,
    });
  };

  public updateAutoReview: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const { owner, repo } = requireRepoParams(request.params);

    const enabled = Boolean(request.body?.enabled);
    const targetBranch =
      typeof request.body?.targetBranch === "string"
        ? request.body.targetBranch
        : "";

    const autoReview = await this.reviewService.updateAutoReviewConfig(
      userId,
      owner,
      repo,
      { enabled, targetBranch },
    );

    response.status(200).json({
      message: enabled
        ? "Auto-review enabled successfully"
        : "Auto-review disabled successfully",
      autoReview,
    });
  };

  public handleGithubWebhook: RequestHandler = async (request, response) => {
    const rawBody = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(
          typeof request.body === "string"
            ? request.body
            : JSON.stringify(request.body ?? {}),
        );

    const result = await this.reviewService.handleGithubWebhook({
      rawBody,
      signatureHeader: readHeaderValue(request.headers["x-hub-signature-256"]),
      eventName: readHeaderValue(request.headers["x-github-event"]),
      deliveryId: readHeaderValue(request.headers["x-github-delivery"]),
    });

    response.status(202).json({
      message: "Webhook accepted",
      ...result,
    });
  };

  public listHistory: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const page = Number(request.query.page);
    const perPage = Number(request.query.perPage);
    const owner =
      typeof request.query.owner === "string"
        ? readStringParam(request.query.owner)
        : undefined;
    const repo =
      typeof request.query.repo === "string"
        ? readStringParam(request.query.repo)
        : undefined;

    const result = await this.reviewService.listReviewHistory(userId, {
      ...(owner ? { owner } : {}),
      ...(repo ? { repo } : {}),
      source: readReviewSource(request.query.source),
      status: readReviewStatus(request.query.status),
      ...(Number.isInteger(page) && page > 0 ? { page } : {}),
      ...(Number.isInteger(perPage) && perPage > 0 ? { perPage } : {}),
    });

    response.status(200).json({
      message: "Review history fetched successfully",
      ...result,
    });
  };

  public getHistoryRun: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const runId = readStringParam(request.params.runId);
    if (!runId) {
      throw AppError.badRequest("Review run id is required.");
    }

    const run = await this.reviewService.getReviewHistoryRun(userId, runId);

    response.status(200).json({
      message: "Review run fetched successfully",
      run,
    });
  };

  public getStats: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const stats = await this.reviewService.getReviewHistoryStats(userId);

    response.status(200).json({
      message: "Review stats fetched successfully",
      stats,
    });
  };
}
