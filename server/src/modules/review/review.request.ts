import type { Request } from "express";

import { AppError } from "../../shared/errors/AppError.js";
import {
  readHeaderValue,
  readPositiveIntParam,
  readStringParam,
} from "../../shared/utils/requestParams.js";
import type {
  HandleGithubWebhookInput,
  ListPullRequestsQuery,
  PublishReviewInput,
  UpdateAutoReviewInput,
} from "./review.types.js";
import { readPullRequestState } from "./review.utils.js";

export function requireUserId(userId: string | undefined): string {
  if (!userId) {
    throw AppError.unauthorized();
  }
  return userId;
}

export function requireRepoParams(params: {
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

export function requirePullParams(params: {
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

export function readPaginationQuery(query: Request["query"]): {
  page?: number;
  perPage?: number;
} {
  const page = Number(query.page);
  const perPage = Number(query.perPage);

  return {
    ...(Number.isInteger(page) && page > 0 ? { page } : {}),
    ...(Number.isInteger(perPage) && perPage > 0 ? { perPage } : {}),
  };
}

export function readListPullRequestsQuery(
  query: Request["query"],
): ListPullRequestsQuery {
  return {
    state: readPullRequestState(query.state),
    ...readPaginationQuery(query),
  };
}

export function readPublishReviewBody(body: unknown): PublishReviewInput {
  const payload =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  return {
    ...(typeof payload.body === "string" ? { body: payload.body } : {}),
    comments: Array.isArray(payload.comments)
      ? (payload.comments as PublishReviewInput["comments"])
      : [],
  };
}

export function readUpdateAutoReviewBody(
  body: unknown,
): UpdateAutoReviewInput {
  const payload =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  return {
    enabled: Boolean(payload.enabled),
    targetBranch:
      typeof payload.targetBranch === "string" ? payload.targetBranch : "",
  };
}

export function readWebhookRequest(request: Request): HandleGithubWebhookInput {
  const rawBody = Buffer.isBuffer(request.body)
    ? request.body
    : Buffer.from(
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body ?? {}),
      );

  return {
    rawBody,
    signatureHeader: readHeaderValue(request.headers["x-hub-signature-256"]),
    eventName: readHeaderValue(request.headers["x-github-event"]),
    deliveryId: readHeaderValue(request.headers["x-github-delivery"]),
  };
}
