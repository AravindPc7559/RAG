import { AppError } from "../../shared/errors/AppError.js";
import type {
  GithubApiRepository,
  GithubApiUser,
  GithubRepositorySummary,
  ListGithubRepositoriesQuery,
} from "./github.types.js";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

async function githubFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<{ data: T; linkHeader: string | null }> {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": "rag-workspace",
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    throw AppError.unauthorized(
      "GitHub access token is invalid or has been revoked. Please reconnect GitHub.",
    );
  }

  if (response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw AppError.tooManyRequests(
        "GitHub API rate limit exceeded. Please try again later.",
      );
    }

    throw AppError.forbidden(
      "GitHub denied this request. Check repository permissions and reconnect if needed.",
    );
  }

  if (response.status === 404) {
    throw AppError.notFound("GitHub repository");
  }

  if (response.status === 429) {
    throw AppError.tooManyRequests(
      "GitHub API rate limit exceeded. Please try again later.",
    );
  }

  if (!response.ok) {
    throw AppError.badGateway("GitHub API request failed.", {
      status: response.status,
      path,
    });
  }

  return {
    data: (await response.json()) as T,
    linkHeader: response.headers.get("link"),
  };
}

function mapRepository(repo: GithubApiRepository): GithubRepositorySummary {
  const isPrivate = Boolean(repo.private);
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    description: repo.description,
    language: repo.language,
    visibility: isPrivate ? "Private" : "Public",
    private: isPrivate,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    updatedAt: repo.updated_at,
    defaultBranch: repo.default_branch,
    htmlUrl: repo.html_url,
    topics: repo.topics ?? [],
  };
}

function hasNextPage(linkHeader: string | null): boolean {
  return Boolean(linkHeader?.includes('rel="next"'));
}

export async function fetchGithubAuthenticatedUser(accessToken: string) {
  const { data } = await githubFetch<GithubApiUser>("/user", accessToken);
  return data;
}

export async function fetchGithubRepositories(
  accessToken: string,
  query: ListGithubRepositoriesQuery = {},
) {
  const page = query.page && query.page > 0 ? query.page : 1;
  const perPage =
    query.perPage && query.perPage > 0 ? Math.min(query.perPage, 100) : 30;
  const sort = query.sort ?? "updated";
  const direction = query.direction ?? "desc";
  const visibility = query.visibility ?? "all";

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort,
    direction,
    visibility,
    affiliation: "owner,collaborator,organization_member",
  });

  const { data, linkHeader } = await githubFetch<GithubApiRepository[]>(
    `/user/repos?${params.toString()}`,
    accessToken,
  );

  const search = query.search?.trim().toLowerCase();
  const repositories = data
    .map(mapRepository)
    .filter((repository) => {
      if (!search) {
        return true;
      }

      return (
        repository.name.toLowerCase().includes(search) ||
        repository.fullName.toLowerCase().includes(search) ||
        (repository.description?.toLowerCase().includes(search) ?? false)
      );
    });

  return {
    repositories,
    page,
    perPage,
    hasNextPage: hasNextPage(linkHeader),
  };
}

export async function fetchGithubRepository(
  accessToken: string,
  owner: string,
  repo: string,
) {
  const { data } = await githubFetch<GithubApiRepository>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    accessToken,
  );

  return mapRepository(data);
}

/**
 * Extension points for future features (contents, branches, PRs, etc.).
 * Keep GitHub REST calls centralized here as those features land.
 */
export const githubApiExtensions = {
  // contents: (token, owner, repo, path) => ...
  // branches: (token, owner, repo) => ...
  // commits: (token, owner, repo) => ...
  // pullRequests: (token, owner, repo) => ...
  // issues: (token, owner, repo) => ...
  // contributors: (token, owner, repo) => ...
} as const;
