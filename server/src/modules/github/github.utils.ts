import type {
  GithubApiPullRequest,
  GithubApiPullRequestFile,
  GithubApiRepository,
  GithubPullRequestFile,
  GithubPullRequestSummary,
  GithubRepositorySummary,
  ListGithubRepositoriesQuery,
} from "./github.types.js";

export function hasNextPage(linkHeader: string | null): boolean {
  return Boolean(linkHeader?.includes('rel="next"'));
}

export function mapRepository(
  repo: GithubApiRepository,
): GithubRepositorySummary {
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

export function mapPullRequest(
  pr: GithubApiPullRequest,
): GithubPullRequestSummary {
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

export function mapPullRequestFile(
  file: GithubApiPullRequestFile,
): GithubPullRequestFile {
  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    ...(file.patch ? { patch: file.patch } : {}),
    ...(file.previous_filename
      ? { previousFilename: file.previous_filename }
      : {}),
  };
}

export function parseListRepositoriesQuery(
  query: Record<string, unknown>,
  readQueryValue: (value: unknown) => string | undefined,
): ListGithubRepositoriesQuery {
  const page = Number.parseInt(readQueryValue(query.page) ?? "", 10);
  const perPage = Number.parseInt(readQueryValue(query.perPage) ?? "", 10);
  const sort = readQueryValue(query.sort);
  const direction = readQueryValue(query.direction);
  const visibility = readQueryValue(query.visibility);
  const search = readQueryValue(query.search);

  const allowedSort = ["created", "updated", "pushed", "full_name"] as const;
  const allowedDirection = ["asc", "desc"] as const;
  const allowedVisibility = ["all", "public", "private"] as const;

  return {
    ...(Number.isFinite(page) && page > 0 ? { page } : {}),
    ...(Number.isFinite(perPage) && perPage > 0 ? { perPage } : {}),
    ...(sort && allowedSort.includes(sort as (typeof allowedSort)[number])
      ? { sort: sort as (typeof allowedSort)[number] }
      : {}),
    ...(direction &&
    allowedDirection.includes(direction as (typeof allowedDirection)[number])
      ? { direction: direction as (typeof allowedDirection)[number] }
      : {}),
    ...(visibility &&
    allowedVisibility.includes(
      visibility as (typeof allowedVisibility)[number],
    )
      ? { visibility: visibility as (typeof allowedVisibility)[number] }
      : {}),
    ...(search ? { search } : {}),
  };
}
