import type { GithubRepoCardProps } from "@/features/github/types/github.components";
import {
  formatGithubDate,
  getIndexingProgress,
  getRepoCardStatusLabel,
} from "@/features/github/utils/githubFormat";
import { isKnowledgeIndexing } from "@/features/knowledge/types/knowledge.types";

export function GithubRepoCard({
  repository,
  knowledge,
  onViewDetails,
  onSync,
  onImport,
  onOpenChat,
  onOpenPullRequests,
}: GithubRepoCardProps) {
  const kb = knowledge?.knowledgeBase;
  const actionStatus = knowledge?.actionStatus ?? "idle";
  const indexing = isKnowledgeIndexing(kb);
  const isBusy =
    actionStatus === "importing" ||
    actionStatus === "syncing" ||
    indexing;
  const isReady = kb?.status === "ready";
  const canSync = Boolean(kb) && !isBusy;
  const canImport = !kb && !isBusy;
  const progress = kb ? getIndexingProgress(kb) : null;
  const statusLabel = getRepoCardStatusLabel({
    repository,
    knowledge,
    progress,
  });

  return (
    <article
      className="document-box github-repo-box"
      aria-label={`${repository.name}, ${statusLabel}`}
    >
      <span className="document-box__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
        </svg>
      </span>
      <span className="document-box__status">{statusLabel}</span>
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

      {indexing && progress ? (
        <div
          className="github-repo-box__progress-panel"
          aria-live="polite"
          aria-label={`Indexing ${progress.percent} percent complete`}
        >
          <div className="github-repo-box__progress-header">
            <strong>{progress.hasTotals ? `${progress.percent}%` : "…"}</strong>
            <span>
              {progress.hasTotals
                ? `${progress.processedFiles} of ${progress.totalFiles} files`
                : "Preparing file list…"}
            </span>
          </div>
          <div className="github-repo-box__progress">
            <span
              className={`github-repo-box__progress-bar${
                progress.hasTotals
                  ? ""
                  : " github-repo-box__progress-bar--indeterminate"
              }`}
              style={
                progress.hasTotals
                  ? { width: `${progress.percent}%` }
                  : undefined
              }
            />
          </div>
          <div className="github-repo-box__progress-stats">
            <span>
              Done <strong>{progress.processedFiles}</strong>
            </span>
            <span>
              Pending <strong>{progress.pendingFiles}</strong>
            </span>
            <span>
              Chunks <strong>{progress.chunkCount}</strong>
            </span>
          </div>
        </div>
      ) : null}

      <div className="github-repo-box__footer">
        <span className="document-box__hint">
          {repository.defaultBranch} · Updated{" "}
          {formatGithubDate(repository.updatedAt)}
          {isReady ? ` · ${kb?.chunkCount ?? 0} chunks` : ""}
        </span>
        {knowledge?.error || kb?.errorMessage ? (
          <p className="github-repo-box__error">
            {knowledge?.error || kb?.errorMessage}
          </p>
        ) : null}
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
            disabled={!canSync}
            onClick={() => onSync(repository)}
          >
            {actionStatus === "syncing" || indexing ? "Working…" : "Sync"}
          </button>
          {!kb || actionStatus === "importing" ? (
            <button
              type="button"
              className="button button--secondary button--compact"
              disabled={!canImport}
              onClick={() => onImport(repository)}
            >
              {actionStatus === "importing" ? "Starting…" : "Import"}
            </button>
          ) : (
            <button
              type="button"
              className="button button--primary button--compact"
              disabled={!isReady}
              onClick={() => onOpenChat(repository)}
            >
              {indexing
                ? progress?.hasTotals
                  ? `${progress.percent}%`
                  : "Indexing…"
                : "Open chat"}
            </button>
          )}
          {onOpenPullRequests ? (
            <button
              type="button"
              className="button button--secondary button--compact"
              disabled={!isReady}
              onClick={() => onOpenPullRequests(repository)}
            >
              Pull requests
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
