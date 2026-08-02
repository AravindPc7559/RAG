export interface GithubStatus {
  connected: boolean;
  githubId?: string;
  username?: string;
  name?: string;
  avatar?: string;
  connectedAt?: string;
  scope?: string;
}

export interface GithubRepositorySummary {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  language: string | null;
  visibility: "Public" | "Private";
  private: boolean;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  defaultBranch: string;
  htmlUrl: string;
  topics: string[];
}

export interface GithubRepositoryListResult {
  repositories: GithubRepositorySummary[];
  page: number;
  perPage: number;
  hasNextPage: boolean;
}

export interface ListGithubRepositoriesQuery {
  page?: number;
  perPage?: number;
  sort?: "created" | "updated" | "pushed" | "full_name";
  direction?: "asc" | "desc";
  visibility?: "all" | "public" | "private";
  search?: string;
}

export interface GithubOAuthTokenResponse {
  access_token: string;
  token_type?: string;
  scope?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

export interface GithubApiUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface GithubApiRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  private: boolean;
  visibility?: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  default_branch: string;
  html_url: string;
  topics?: string[];
  owner: {
    login: string;
  };
}

export interface ConnectGithubInput {
  userId: string;
  githubId: string;
  githubUsername: string;
  githubName?: string;
  githubAvatar?: string;
  githubAccessToken: string;
  githubRefreshToken?: string;
  githubTokenType?: string;
  githubScope?: string;
}

export interface GithubTreeItem {
  path: string;
  type: string;
  sha: string;
  size?: number;
  url?: string;
}

export interface GithubTreeResponse {
  sha: string;
  truncated: boolean;
  tree: GithubTreeItem[];
}

export interface GithubContentFileResponse {
  type: string;
  encoding?: string;
  size: number;
  name: string;
  path: string;
  content?: string;
  sha: string;
}

export interface GithubTreeBlob {
  path: string;
  sha: string;
  size: number;
}

export interface GithubApiPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  draft?: boolean;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  } | null;
  head: {
    sha: string;
    ref: string;
  };
  base: {
    sha: string;
    ref: string;
  };
  labels?: Array<{ name: string }>;
  additions?: number;
  deletions?: number;
  changed_files?: number;
}

export interface GithubApiPullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

export interface GithubPullRequestSummary {
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

export interface GithubPullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string;
}

export interface CreatePullRequestReviewCommentInput {
  path: string;
  body: string;
  line: number;
  side?: "LEFT" | "RIGHT";
}

export interface CreatePullRequestReviewInput {
  commitId: string;
  body?: string;
  event?: "COMMENT" | "APPROVE" | "REQUEST_CHANGES";
  comments: CreatePullRequestReviewCommentInput[];
}

export interface ListPullRequestsQuery {
  state?: "open" | "closed" | "all";
  page?: number;
  perPage?: number;
}
