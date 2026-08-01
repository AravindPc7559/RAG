export type ReviewCommentSeverity = "info" | "warning" | "important";

export interface ReviewPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  draft: boolean;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  authorLogin: string;
  authorAvatarUrl: string | null;
  headSha: string;
  headRef: string;
  baseRef: string;
  labels: string[];
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}

export interface ReviewPullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  hasPatch: boolean;
  patchPreview?: string;
}

export interface ReviewDraftComment {
  id: string;
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
  severity: ReviewCommentSeverity;
  body: string;
}

export interface AnalyzeReviewResult {
  pullRequestNumber: number;
  knowledgeBaseId: string;
  analyzedFiles: string[];
  skippedFiles: string[];
  comments: ReviewDraftComment[];
}

export interface PublishReviewResult {
  reviewId: number;
  htmlUrl: string;
  state: string;
  publishedCount: number;
}
