import { AppError } from "../../shared/errors/AppError.js";
import { MAX_CHANGED_FILES, MAX_COMMENTS } from "./review.constants.js";
import type { PublishReviewCommentInput } from "./review.types.js";

export function assertPublishComments(
  comments: PublishReviewCommentInput[] | undefined,
): asserts comments is PublishReviewCommentInput[] {
  if (!comments?.length) {
    throw AppError.badRequest("Select at least one comment to publish.");
  }

  if (comments.length > MAX_COMMENTS) {
    throw AppError.badRequest(
      `You can publish at most ${MAX_COMMENTS} comments at once.`,
    );
  }

  for (const comment of comments) {
    if (!comment.path?.trim() || !comment.body?.trim()) {
      throw AppError.badRequest("Each comment requires a file path and body.");
    }
    if (!Number.isInteger(comment.line) || comment.line < 1) {
      throw AppError.badRequest("Each comment requires a valid line number.");
    }
  }
}

export function partitionAnalyzableFiles<
  T extends { filename: string; patch?: string },
>(files: T[]): {
  included: T[];
  skippedFiles: string[];
} {
  const skippedFiles: string[] = [];
  const analyzable = files.filter((file) => {
    if (!file.patch) {
      skippedFiles.push(file.filename);
      return false;
    }
    return true;
  });

  if (analyzable.length > MAX_CHANGED_FILES) {
    for (const file of analyzable.slice(MAX_CHANGED_FILES)) {
      skippedFiles.push(file.filename);
    }
  }

  return {
    included: analyzable.slice(0, MAX_CHANGED_FILES),
    skippedFiles,
  };
}

export function assertTargetBranch(targetBranch: string | undefined): string {
  const value = targetBranch?.trim();
  if (!value) {
    throw AppError.badRequest("A target branch is required for auto-review.");
  }
  return value;
}
