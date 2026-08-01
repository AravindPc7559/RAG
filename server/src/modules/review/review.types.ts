export type ReviewCommentSeverity = "info" | "warning" | "important";

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
  analyzedFiles: string[];
  skippedFiles: string[];
  comments: ReviewDraftComment[];
}

export interface PublishReviewCommentInput {
  path: string;
  line: number;
  side?: "LEFT" | "RIGHT";
  body: string;
}

export interface PublishReviewResult {
  reviewId: number;
  htmlUrl: string;
  state: string;
  publishedCount: number;
}

export interface RetrievalPort {
  retrieveContext(input: {
    userId: string;
    knowledgeBaseId: string;
    query: string;
    limit?: number;
  }): Promise<Array<{ text: string; sourcePath?: string; score: number }>>;
}

export interface KnowledgeLookupPort {
  getReadyKnowledgeBase(
    userId: string,
    owner: string,
    repo: string,
  ): Promise<{ knowledgeBaseId: string; fullName: string }>;
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
}
