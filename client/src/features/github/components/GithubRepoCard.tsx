import type { GithubRepository } from "@/features/github/types/github.types";

interface GithubRepoCardProps {
  repository: GithubRepository;
  onViewDetails: (repository: GithubRepository) => void;
  onSync: () => void;
  onImport: (repository: GithubRepository) => void;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function GithubRepoCard({
  repository,
  onViewDetails,
  onSync,
  onImport,
}: GithubRepoCardProps) {
  return (
    <article
      className="document-box github-repo-box"
      aria-label={`${repository.name}, ${repository.visibility}`}
    >
      <span className="document-box__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
        </svg>
      </span>
      <span className="document-box__status">{repository.visibility}</span>
      <h3 className="document-box__title" title={repository.name}>
        {repository.name}
      </h3>
      <p className="github-repo-box__owner">{repository.owner}</p>
      <p
        className="document-box__description"
        title={repository.description ?? undefined}
      >
        {repository.description || "No description provided."}
      </p>
      <div className="github-repo-box__meta">
        <span>{repository.language ?? "Unknown"}</span>
        <span>★ {repository.stargazersCount}</span>
        <span>⑂ {repository.forksCount}</span>
      </div>
      <span className="document-box__hint">
        {repository.defaultBranch} · Updated{" "}
        {formatUpdatedAt(repository.updatedAt)}
      </span>
      <div className="github-repo-box__actions">
        <button
          type="button"
          className="button button--secondary button--compact"
          onClick={() => onViewDetails(repository)}
        >
          View Details
        </button>
        <button
          type="button"
          className="button button--secondary button--compact"
          onClick={onSync}
        >
          Sync
        </button>
        <button
          type="button"
          className="button button--secondary button--compact"
          onClick={() => onImport(repository)}
        >
          Import
        </button>
        <a
          className="button button--ghost-dark button--compact"
          href={repository.htmlUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open on GitHub
        </a>
      </div>
    </article>
  );
}
