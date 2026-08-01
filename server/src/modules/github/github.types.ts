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
