import type {
  PullStateFilter,
  ReviewCommentSeverity,
} from "@/features/review/types/review.types";

export function formatReviewDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getSeverityClassName(severity: ReviewCommentSeverity) {
  if (severity === "important") {
    return "review-comment__severity review-comment__severity--important";
  }
  if (severity === "warning") {
    return "review-comment__severity review-comment__severity--warning";
  }
  return "review-comment__severity";
}

export function isPullStateFilter(value: string): value is PullStateFilter {
  return value === "open" || value === "closed" || value === "all";
}

export function createPullsApiPath(owner: string, repo: string) {
  return `/review/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
}
