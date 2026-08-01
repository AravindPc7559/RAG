import type { GithubRepository } from "@/features/github/types/github.types";

interface GithubRepoDetailsModalProps {
  repository: GithubRepository | null;
  isLoading: boolean;
  onClose: () => void;
}

export function GithubRepoDetailsModal({
  repository,
  isLoading,
  onClose,
}: GithubRepoDetailsModalProps) {
  if (!repository && !isLoading) {
    return null;
  }

  return (
    <div className="github-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="github-modal__backdrop"
        aria-label="Close repository details"
        onClick={onClose}
      />
      <div className="github-modal__panel">
        {isLoading || !repository ? (
          <p>Loading repository details…</p>
        ) : (
          <>
            <header className="github-modal__header">
              <div>
                <span className="eyebrow">Repository</span>
                <h2>{repository.fullName}</h2>
              </div>
              <button
                type="button"
                className="button button--secondary button--compact"
                onClick={onClose}
              >
                Close
              </button>
            </header>
            <p>{repository.description || "No description provided."}</p>
            <dl className="github-modal__details">
              <div>
                <dt>Owner</dt>
                <dd>{repository.owner}</dd>
              </div>
              <div>
                <dt>Visibility</dt>
                <dd>{repository.visibility}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{repository.language ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Default branch</dt>
                <dd>{repository.defaultBranch}</dd>
              </div>
              <div>
                <dt>Stars</dt>
                <dd>{repository.stargazersCount}</dd>
              </div>
              <div>
                <dt>Forks</dt>
                <dd>{repository.forksCount}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{new Date(repository.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
            <a
              className="button button--primary"
              href={repository.htmlUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open on GitHub
            </a>
          </>
        )}
      </div>
    </div>
  );
}
