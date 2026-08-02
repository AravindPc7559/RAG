import type { ReviewCommentSeverity } from "@/features/review/types/review.types";

export function formatReviewTimestamp(value: string): string {
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

export function reviewSeverityClass(severity: ReviewCommentSeverity): string {
  if (severity === "important") {
    return "review-comment__severity review-comment__severity--important";
  }
  if (severity === "warning") {
    return "review-comment__severity review-comment__severity--warning";
  }
  return "review-comment__severity";
}
