export function reviewPullsPath(owner: string, repo: string): string {
  return `/review/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
}

export function reviewAutoReviewPath(owner: string, repo: string): string {
  return `/review/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/auto-review`;
}
