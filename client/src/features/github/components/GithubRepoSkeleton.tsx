export function GithubRepoSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="documents-page__grid github-page__grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="github-repo-card github-skeleton">
          <span className="github-skeleton__block github-skeleton__icon" />
          <span className="github-skeleton__block github-skeleton__line" />
          <span className="github-skeleton__block github-skeleton__line github-skeleton__line--short" />
          <span className="github-skeleton__block github-skeleton__line" />
          <span className="github-skeleton__block github-skeleton__line github-skeleton__line--short" />
        </div>
      ))}
    </div>
  );
}
