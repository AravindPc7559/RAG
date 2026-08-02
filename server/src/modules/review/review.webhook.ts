import { AppError } from "../../shared/errors/AppError.js";
import { AUTO_REVIEW_ACTIONS } from "./review.constants.js";

export interface ParsedPullRequestWebhook {
  action: string;
  prNumber: number;
  headSha: string;
  baseRef: string;
  githubRepoId: string;
  owner: string;
  repo: string;
  isDraft: boolean;
}

export function parsePullRequestWebhookPayload(
  rawBody: Buffer,
  eventName?: string,
): ParsedPullRequestWebhook | null {
  if (eventName === "ping" || eventName !== "pull_request") {
    return null;
  }

  let payload: {
    action?: string;
    pull_request?: {
      number?: number;
      draft?: boolean;
      head?: { sha?: string };
      base?: { ref?: string };
    };
    repository?: {
      id?: number | string;
      name?: string;
      owner?: { login?: string };
    };
  };

  try {
    payload = JSON.parse(rawBody.toString("utf8")) as typeof payload;
  } catch {
    throw AppError.badRequest("Invalid GitHub webhook payload.");
  }

  const action = payload.action ?? "";
  if (!AUTO_REVIEW_ACTIONS.has(action)) {
    return null;
  }

  const pullRequest = payload.pull_request;
  const repository = payload.repository;
  const prNumber = pullRequest?.number;
  const headSha = pullRequest?.head?.sha?.trim();
  const baseRef = pullRequest?.base?.ref?.trim();
  const githubRepoId =
    repository?.id !== undefined ? String(repository.id) : "";
  const owner = repository?.owner?.login?.trim();
  const repo = repository?.name?.trim();

  if (!prNumber || !headSha || !baseRef || !githubRepoId || !owner || !repo) {
    throw AppError.badRequest("Incomplete pull_request webhook payload.");
  }

  if (pullRequest?.draft && action !== "ready_for_review") {
    return null;
  }

  return {
    action,
    prNumber,
    headSha,
    baseRef,
    githubRepoId,
    owner,
    repo,
    isDraft: Boolean(pullRequest?.draft),
  };
}
