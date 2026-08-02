export type ReviewCommentSeverity = "info" | "warning" | "important";
export type ReviewPullRequestState = "open" | "closed";
export type ReviewPullRequestSide = "LEFT" | "RIGHT";
export type ListPullRequestsState = "open" | "closed" | "all";

export interface ReviewDraftComment {
  id: string;
  path: string;
  line: number;
  side: ReviewPullRequestSide;
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

export interface ReviewPullRequestSummary {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: ReviewPullRequestState;
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

export interface ReviewPullRequestDetail {
  pullRequest: ReviewPullRequestSummary;
  knowledgeBaseId: string;
  files: ReviewPullRequestFileSummary[];
}

export interface AnalyzeReviewResult {
  pullRequestNumber: number;
  knowledgeBaseId: string;
  analyzedFiles: string[];
  skippedFiles: string[];
  comments: ReviewDraftComment[];
}

export interface PublishReviewCommentInput {
  path: string;
  line: number;
  side?: ReviewPullRequestSide;
  body: string;
}

export interface PublishReviewResult {
  reviewId: number;
  htmlUrl: string;
  state: string;
  publishedCount: number;
}

export interface ListPullRequestsQuery {
  state?: ListPullRequestsState;
  page?: number;
  perPage?: number;
}

export interface ReadyKnowledgeBase {
  knowledgeBaseId: string;
  fullName: string;
}

export interface RetrievedContextChunk {
  text: string;
  sourcePath?: string;
  score: number;
}

export interface GithubPullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface CreateReviewInput {
  commitId: string;
  body?: string;
  comments: Array<{
    path: string;
    body: string;
    line: number;
    side?: ReviewPullRequestSide;
  }>;
}

export interface LlmComment {
  path?: string;
  line?: number;
  side?: string;
  severity?: string;
  body?: string;
}

export interface ReviewFileContext {
  filename: string;
  patch: string;
  validLines: Set<number>;
  context: string;
}

export interface GenerateCommentsInput {
  title: string;
  body: string | null;
  files: Array<{ filename: string; patch: string; context: string }>;
}

export interface RetrievalPort {
  retrieveContext(input: {
    userId: string;
    knowledgeBaseId: string;
    query: string;
    limit?: number;
  }): Promise<RetrievedContextChunk[]>;
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
    query: ListPullRequestsQuery,
  ): Promise<{
    pullRequests: ReviewPullRequestSummary[];
    page: number;
    perPage: number;
    hasNextPage: boolean;
  }>;
  getPullRequest(
    accessToken: string,
    owner: string,
    repo: string,
    number: number,
  ): Promise<ReviewPullRequestSummary>;
  getPullRequestFiles(
    accessToken: string,
    owner: string,
    repo: string,
    number: number,
  ): Promise<GithubPullRequestFile[]>;
  createReview(
    accessToken: string,
    owner: string,
    repo: string,
    number: number,
    input: CreateReviewInput,
  ): Promise<{ id: number; htmlUrl: string; state: string }>;
}
