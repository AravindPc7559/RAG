import { baseService } from "@/services/baseService";
import { env } from "@/config/env";
import type {
  GithubRepositoriesQuery,
  GithubRepositoriesResult,
  GithubRepository,
  GithubStatus,
} from "@/features/github/types/github.types";

interface GithubStatusResponse {
  message: string;
  status: GithubStatus;
}

interface GithubRepositoriesResponse extends GithubRepositoriesResult {
  message: string;
}

interface GithubRepositoryResponse {
  message: string;
  repository: GithubRepository;
}

function toQueryParams(query: GithubRepositoriesQuery = {}) {
  const params = new URLSearchParams();

  if (query.page) {
    params.set("page", String(query.page));
  }
  if (query.perPage) {
    params.set("perPage", String(query.perPage));
  }
  if (query.sort) {
    params.set("sort", query.sort);
  }
  if (query.direction) {
    params.set("direction", query.direction);
  }
  if (query.visibility) {
    params.set("visibility", query.visibility);
  }
  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const githubService = {
  getLoginUrl() {
    return `${env.apiBaseUrl}/github/login`;
  },

  startConnect() {
    window.location.assign(this.getLoginUrl());
  },

  async getStatus() {
    const response = await baseService.get<GithubStatusResponse>(
      "/github/status",
    );
    return response.data.status;
  },

  async listRepositories(query: GithubRepositoriesQuery = {}) {
    const response = await baseService.get<GithubRepositoriesResponse>(
      `/github/repos${toQueryParams(query)}`,
    );
    return {
      repositories: response.data.repositories,
      page: response.data.page,
      perPage: response.data.perPage,
      hasNextPage: response.data.hasNextPage,
    } satisfies GithubRepositoriesResult;
  },

  async getRepository(owner: string, repo: string) {
    const response = await baseService.get<GithubRepositoryResponse>(
      `/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    );
    return response.data.repository;
  },

  async disconnect() {
    const response = await baseService.delete<GithubStatusResponse>(
      "/github/disconnect",
    );
    return response.data.status;
  },

  async refreshProfile() {
    const response = await baseService.post<GithubStatusResponse>(
      "/github/refresh-profile",
    );
    return response.data.status;
  },
};
