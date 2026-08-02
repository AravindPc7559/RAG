import { createHmac, timingSafeEqual } from "node:crypto";

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
      "User-Agent": "sourcesense",
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

  const text = await response.text();
  const data = (text ? JSON.parse(text) : null) as T;

  return {
    data,
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

interface GithubTreeItem {
  path: string;
  type: string;
  sha: string;
  size?: number;
  url?: string;
}

interface GithubTreeResponse {
  sha: string;
  truncated: boolean;
  tree: GithubTreeItem[];
}

interface GithubContentFileResponse {
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

interface GithubApiPullRequest {
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

interface GithubApiPullRequestFile {
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

function mapPullRequest(pr: GithubApiPullRequest): GithubPullRequestSummary {
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state === "closed" ? "closed" : "open",
    draft: Boolean(pr.draft),
    htmlUrl: pr.html_url,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    authorLogin: pr.user?.login ?? "unknown",
    authorAvatarUrl: pr.user?.avatar_url ?? null,
    headSha: pr.head.sha,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
    labels: (pr.labels ?? []).map((label) => label.name),
    ...(pr.additions !== undefined ? { additions: pr.additions } : {}),
    ...(pr.deletions !== undefined ? { deletions: pr.deletions } : {}),
    ...(pr.changed_files !== undefined
      ? { changedFiles: pr.changed_files }
      : {}),
  };
}

export async function fetchPullRequests(
  accessToken: string,
  owner: string,
  repo: string,
  query: {
    state?: "open" | "closed" | "all";
    page?: number;
    perPage?: number;
  } = {},
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

  return data.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    ...(file.patch ? { patch: file.patch } : {}),
    ...(file.previous_filename
      ? { previousFilename: file.previous_filename }
      : {}),
  }));
}

export async function createPullRequestReview(
  accessToken: string,
  owner: string,
  repo: string,
  number: number,
  input: {
    commitId: string;
    body?: string;
    event?: "COMMENT" | "APPROVE" | "REQUEST_CHANGES";
    comments: CreatePullRequestReviewCommentInput[];
  },
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

export async function fetchRepositoryBranches(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<Array<{ name: string; protected: boolean }>> {
  const branches: Array<{ name: string; protected: boolean }> = [];
  let page = 1;

  while (page <= 10) {
    const { data, linkHeader } = await githubFetch<
      Array<{ name: string; protected: boolean }>
    >(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100&page=${page}`,
      accessToken,
    );

    for (const branch of data) {
      branches.push({
        name: branch.name,
        protected: Boolean(branch.protected),
      });
    }

    if (!hasNextPage(linkHeader) || data.length === 0) {
      break;
    }
    page += 1;
  }

  return branches;
}

export async function createRepositoryWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  input: {
    url: string;
    secret: string;
    events?: string[];
  },
): Promise<{ id: number; active: boolean; url: string }> {
  const { data } = await githubFetch<{
    id: number;
    active: boolean;
    config?: { url?: string };
  }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`,
    accessToken,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: input.events ?? ["pull_request"],
        config: {
          url: input.url,
          content_type: "json",
          secret: input.secret,
          insecure_ssl: "0",
        },
      }),
    },
  );

  return {
    id: data.id,
    active: Boolean(data.active),
    url: data.config?.url ?? input.url,
  };
}

export async function getRepositoryWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  hookId: number,
): Promise<{ id: number; active: boolean; url: string } | null> {
  try {
    const { data } = await githubFetch<{
      id: number;
      active: boolean;
      config?: { url?: string };
    }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks/${hookId}`,
      accessToken,
    );

    return {
      id: data.id,
      active: Boolean(data.active),
      url: data.config?.url ?? "",
    };
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function deleteRepositoryWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  hookId: number,
): Promise<void> {
  try {
    await githubFetch<unknown>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks/${hookId}`,
      accessToken,
      { method: "DELETE" },
    );
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      return;
    }
    throw error;
  }
}

export function verifyGithubWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=") || !secret) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(`sha256=${digest}`, "utf8");
  const received = Buffer.from(signatureHeader, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}
