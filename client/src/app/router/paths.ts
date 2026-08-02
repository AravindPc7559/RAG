export const paths = {
  dashboard: "/",
  chat: "/chat/:documentId",
  documents: "/documents",
  github: "/github",
  githubPulls: "/github/:owner/:repo/pulls",
  githubPullReview: "/github/:owner/:repo/pulls/:number",
  reviews: "/reviews",
  reviewRun: "/reviews/:runId",
  login: "/login",
  register: "/register",
} as const;

export function createChatPath(documentId: string) {
  return `/chat/${encodeURIComponent(documentId)}`;
}

export function createPullRequestsPath(owner: string, repo: string) {
  return `/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
}

export function createPullRequestPath(
  owner: string,
  repo: string,
  number: number,
) {
  return `${createPullRequestsPath(owner, repo)}/${number}`;
}

export function createReviewRunPath(runId: string) {
  return `/reviews/${encodeURIComponent(runId)}`;
}
