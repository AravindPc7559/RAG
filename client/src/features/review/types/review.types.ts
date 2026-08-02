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
  prTitle?: string;
  headSha?: string;
  analyzedFiles: string[];
  skippedFiles: string[];
  comments: ReviewDraftComment[];
  runId?: string;
}

export interface PublishReviewResult {
  reviewId: number;
  htmlUrl: string;
  state: string;
  publishedCount: number;
  runId?: string;
}

export interface AutoReviewConfig {
  enabled: boolean;
  targetBranch: string;
  webhookActive: boolean;
}

export type ReviewRunSource = "manual" | "auto";
export type ReviewRunStatus =
  | "generated"
  | "published"
  | "no_comments"
  | "failed";

export interface ReviewRunSeverityCounts {
  info: number;
  warning: number;
  important: number;
}

export interface ReviewRunComment {
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
  severity: ReviewCommentSeverity;
  body: string;
}

export interface ReviewRunSummary {
  runId: string;
  knowledgeBaseId: string;
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
  prTitle: string;
  source: ReviewRunSource;
  status: ReviewRunStatus;
  jobId?: string;
  githubReviewId?: number;
  htmlUrl?: string;
  githubState?: string;
  publishedCount: number;
  commentCount: number;
  analyzedFiles: string[];
  skippedFiles: string[];
  summaryBody?: string;
  errorMessage?: string;
  severityCounts: ReviewRunSeverityCounts;
  createdAt: string;
  finishedAt: string;
}

export interface ReviewRunDetail extends ReviewRunSummary {
  comments: ReviewRunComment[];
}

export interface ReviewHistoryStats {
  totalRuns: number;
  generatedCount: number;
  publishedCount: number;
  failedCount: number;
  noCommentsCount: number;
  manualCount: number;
  autoCount: number;
  commentsPublished: number;
  commentsGenerated: number;
  severityTotals: ReviewRunSeverityCounts;
  last7Days: Array<{ date: string; count: number }>;
  topRepos: Array<{ owner: string; repo: string; count: number }>;
}
