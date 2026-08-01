import type { KnowledgeRepoState } from "@/features/knowledge/types/knowledge.types";
import type { ApiErrorPayload } from "@/services/apiErrors";
import type { AsyncStatus } from "@/shared/types/asyncState";

export interface GithubStatus {
  connected: boolean;
  githubId?: string;
  username?: string;
  name?: string;
  avatar?: string;
  connectedAt?: string;
  scope?: string;
}

export interface GithubRepository {
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

export interface GithubRepositoriesQuery {
  page?: number;
  perPage?: number;
  sort?: "created" | "updated" | "pushed" | "full_name";
  direction?: "asc" | "desc";
  visibility?: "all" | "public" | "private";
  search?: string;
}

export interface GithubRepositoriesResult {
  repositories: GithubRepository[];
  page: number;
  perPage: number;
  hasNextPage: boolean;
}

export interface GithubState {
  connection: GithubStatus | null;
  connectionStatus: AsyncStatus;
  repositories: GithubRepository[];
  repositoriesStatus: AsyncStatus;
  repositoriesQuery: GithubRepositoriesQuery;
  hasNextPage: boolean;
  selectedRepository: GithubRepository | null;
  selectedRepositoryStatus: AsyncStatus;
  knowledgeByRepo: Record<string, KnowledgeRepoState>;
  knowledgeStatus: AsyncStatus;
  error: ApiErrorPayload | null;
}
