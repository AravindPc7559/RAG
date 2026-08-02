export type ReviewCommentSeverity = "info" | "warning" | "important";

export interface LlmComment {
  path?: string;
  line?: number;
  side?: string;
  severity?: string;
  body?: string;
}

export interface ReviewDraftComment {
  id: string;
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
  severity: ReviewCommentSeverity;
  body: string;
}

export interface ReviewPullRequestFileSummary {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  hasPatch: boolean;
  patchPreview?: string;
}

export interface ReviewPullRequestDetail {
  pullRequest: {
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
  };
  knowledgeBaseId: string;
  files: ReviewPullRequestFileSummary[];
}

export interface AnalyzeReviewResult {
  pullRequestNumber: number;
  knowledgeBaseId: string;
  prTitle: string;
  headSha: string;
  analyzedFiles: string[];
  skippedFiles: string[];
  comments: ReviewDraftComment[];
  runId?: string;
}

export interface PublishReviewCommentInput {
  path: string;
  line: number;
  side?: "LEFT" | "RIGHT";
  severity?: ReviewCommentSeverity;
  body: string;
}

export interface PublishReviewResult {
  reviewId: number;
  htmlUrl: string;
  state: string;
  publishedCount: number;
  runId?: string;
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

export interface ReviewRunCommentView {
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
  comments: ReviewRunCommentView[];
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

export interface AnalyzeReviewMeta {
  source?: ReviewRunSource;
  jobId?: string;
  persist?: boolean;
}

export interface PublishReviewMeta {
  source?: ReviewRunSource;
  jobId?: string;
  runId?: string;
  analyzedFiles?: string[];
  skippedFiles?: string[];
  prTitle?: string;
}

export interface RetrievalPort {
  retrieveContext(input: {
    userId: string;
    knowledgeBaseId: string;
    query: string;
    limit?: number;
  }): Promise<Array<{ text: string; sourcePath?: string; score: number }>>;
}

export interface ReadyKnowledgeBase {
  knowledgeBaseId: string;
  fullName: string;
  githubRepoId: string;
  defaultBranch: string;
  owner: string;
  repo: string;
}

export interface KnowledgeLookupPort {
  getReadyKnowledgeBase(
    userId: string,
    owner: string,
    repo: string,
  ): Promise<ReadyKnowledgeBase>;
}

export interface GithubPrPort {
  getAccessToken(userId: string): Promise<string>;
  listPullRequests(
    accessToken: string,
    owner: string,
    repo: string,
    query: { state?: "open" | "closed" | "all"; page?: number; perPage?: number },
  ): Promise<{
    pullRequests: ReviewPullRequestDetail["pullRequest"][];
    page: number;
    perPage: number;
    hasNextPage: boolean;
  }>;
  getPullRequest(
    accessToken: string,
    owner: string,
    repo: string,
    number: number,
  ): Promise<ReviewPullRequestDetail["pullRequest"]>;
  getPullRequestFiles(
    accessToken: string,
    owner: string,
    repo: string,
    number: number,
  ): Promise<
    Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      changes: number;
      patch?: string;
    }>
  >;
  createReview(
    accessToken: string,
    owner: string,
    repo: string,
    number: number,
    input: {
      commitId: string;
      body?: string;
      comments: Array<{
        path: string;
        body: string;
        line: number;
        side?: "LEFT" | "RIGHT";
      }>;
    },
  ): Promise<{ id: number; htmlUrl: string; state: string }>;
  createWebhook(
    accessToken: string,
    owner: string,
    repo: string,
    input: { url: string; secret: string },
  ): Promise<{ id: number; active: boolean; url: string }>;
  getWebhook(
    accessToken: string,
    owner: string,
    repo: string,
    hookId: number,
  ): Promise<{ id: number; active: boolean; url: string } | null>;
  deleteWebhook(
    accessToken: string,
    owner: string,
    repo: string,
    hookId: number,
  ): Promise<void>;
  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
    secret: string,
  ): boolean;
}

export interface AutoReviewConfigView {
  enabled: boolean;
  targetBranch: string;
  webhookActive: boolean;
}

export interface UpdateAutoReviewInput {
  enabled: boolean;
  targetBranch: string;
}
