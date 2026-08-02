import { PATCH_PREVIEW_CHARS } from "./review.constants.js";
import { truncatePatch } from "./review.patch.js";
import type {
  AutoReviewConfigView,
  PublishReviewCommentInput,
  ReviewDraftComment,
  ReviewPullRequestFileSummary,
} from "./review.types.js";

export function toAutoReviewConfigView(input?: {
  enabled: boolean;
  targetBranch: string;
  webhookActive: boolean;
} | null): AutoReviewConfigView {
  if (!input) {
    return {
      enabled: false,
      targetBranch: "",
      webhookActive: false,
    };
  }

  return {
    enabled: input.enabled,
    targetBranch: input.targetBranch,
    webhookActive: input.webhookActive,
  };
}

export function toPullRequestFileSummaries(
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>,
): ReviewPullRequestFileSummary[] {
  return files.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    hasPatch: Boolean(file.patch),
    ...(file.patch
      ? {
          patchPreview: truncatePatch(file.patch, PATCH_PREVIEW_CHARS),
        }
      : {}),
  }));
}

export function toGithubReviewComments(
  comments: PublishReviewCommentInput[],
): Array<{
  path: string;
  body: string;
  line: number;
  side: "LEFT" | "RIGHT";
}> {
  return comments.map((comment) => ({
    path: comment.path.trim(),
    body: comment.body.trim(),
    line: comment.line,
    side: comment.side === "LEFT" ? "LEFT" : "RIGHT",
  }));
}

export function toPublishCommentsFromDrafts(
  comments: ReviewDraftComment[],
): PublishReviewCommentInput[] {
  return comments.map((comment) => ({
    path: comment.path,
    line: comment.line,
    side: comment.side,
    body: comment.body,
  }));
}
