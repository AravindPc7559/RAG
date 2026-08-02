import { AppError } from "../../shared/errors/AppError.js";
import {
  GITHUB_API_BASE,
  GITHUB_API_VERSION,
  GITHUB_USER_AGENT,
} from "./github.constants.js";
import type {
  CreatePullRequestReviewInput,
  GithubApiPullRequest,
  GithubApiPullRequestFile,
  GithubApiRepository,
  GithubApiUser,
  GithubContentFileResponse,
  GithubPullRequestFile,
  GithubTreeBlob,
  GithubTreeResponse,
  ListGithubRepositoriesQuery,
  ListPullRequestsQuery,
} from "./github.types.js";
import {
  hasNextPage,
  mapPullRequest,
  mapPullRequestFile,
  mapRepository,
} from "./github.utils.js";

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
      "User-Agent": GITHUB_USER_AGENT,
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

export async function fetchRepositoryTree(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ truncated: boolean; blobs: GithubTreeBlob[] }> {
  const { data } = await githubFetch<GithubTreeResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    accessToken,
  );

  const blobs = data.tree
    .filter((item) => item.type === "blob" && item.path)
    .map((item) => ({
      path: item.path,
      sha: item.sha,
      size: item.size ?? 0,
    }));

  return {
    truncated: Boolean(data.truncated),
    blobs,
  };
}

export async function fetchFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | null> {
  const { data } = await githubFetch<GithubContentFileResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}?ref=${encodeURIComponent(ref)}`,
    accessToken,
  );

  if (data.type !== "file" || !data.content || data.encoding !== "base64") {
    return null;
  }

  try {
    const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64");
    if (decoded.includes(0)) {
      return null;
    }
    return decoded.toString("utf8");
  } catch {
    return null;
  }
}

export async function fetchPullRequests(
  accessToken: string,
  owner: string,
  repo: string,
  query: ListPullRequestsQuery = {},
) {
  const page = query.page && query.page > 0 ? query.page : 1;
  const perPage =
    query.perPage && query.perPage > 0 ? Math.min(query.perPage, 50) : 20;
  const state = query.state ?? "open";
  const params = new URLSearchParams({
    state,
    page: String(page),
    per_page: String(perPage),
    sort: "updated",
    direction: "desc",
  });

  const { data, linkHeader } = await githubFetch<GithubApiPullRequest[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${params.toString()}`,
    accessToken,
  );

  return {
    pullRequests: data.map(mapPullRequest),
    page,
    perPage,
    hasNextPage: hasNextPage(linkHeader),
  };
}

export async function fetchPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  number: number,
) {
  const { data } = await githubFetch<GithubApiPullRequest>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`,
    accessToken,
  );
  return mapPullRequest(data);
}

export async function fetchPullRequestFiles(
  accessToken: string,
  owner: string,
  repo: string,
  number: number,
): Promise<GithubPullRequestFile[]> {
  const { data } = await githubFetch<GithubApiPullRequestFile[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/files?per_page=100`,
    accessToken,
  );

  return data.map(mapPullRequestFile);
}

export async function createPullRequestReview(
  accessToken: string,
  owner: string,
  repo: string,
  number: number,
  input: CreatePullRequestReviewInput,
) {
  const { data } = await githubFetch<{
    id: number;
    html_url: string;
    state: string;
  }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/reviews`,
    accessToken,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commit_id: input.commitId,
        body: input.body ?? "",
        event: input.event ?? "COMMENT",
        comments: input.comments.map((comment) => ({
          path: comment.path,
          body: comment.body,
          line: comment.line,
          side: comment.side ?? "RIGHT",
        })),
      }),
    },
  );

  return {
    id: data.id,
    htmlUrl: data.html_url,
    state: data.state,
  };
}
