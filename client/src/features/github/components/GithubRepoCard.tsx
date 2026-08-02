import { GithubRepoAutoReviewControls } from "@/features/github/components/GithubRepoAutoReviewControls";
import { useRepoAutoReview } from "@/features/github/hooks/useRepoAutoReview";
import type { GithubRepository } from "@/features/github/types/github.types";
import {
  formatGithubUpdatedAt,
  getKnowledgeIndexingProgress,
} from "@/features/github/utils/githubFormat";
import {
  isKnowledgeIndexing,
  type KnowledgeRepoState,
} from "@/features/knowledge/types/knowledge.types";

interface GithubRepoCardProps {
  repository: GithubRepository;
  knowledge?: KnowledgeRepoState;
  onViewDetails: (repository: GithubRepository) => void;
  onSync: (repository: GithubRepository) => void;
  onImport: (repository: GithubRepository) => void;
  onOpenChat: (repository: GithubRepository) => void;
  onOpenPullRequests: (repository: GithubRepository) => void;
}

function IconGitHub({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.8 6.7 19.6l1-5.8-4.2-4.1 5.9-.9L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFork() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="19" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M6 7.2v9.6M18 7.2v2.3A4.5 4.5 0 0 1 13.5 14H6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBranch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3v12m0 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0v2a4 4 0 0 1-4 4H6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 8v4l2.5 1.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChunks() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 12v9M4.5 7.8 12 12l7.5-4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCode() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m8 8-4 4 4 4M16 8l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconSync() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12a8 8 0 1 1-2.3-5.6M20 5v4h-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 18.5 6.2 15A7.5 7.5 0 1 1 9 19.2L5 18.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPr() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 4v12m0 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm12-8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 0v3.5A3.5 3.5 0 0 1 14.5 15H6M6 4a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="5"
        y="8"
        width="14"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 8V5M9 13h.01M15 13h.01M9 16h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 5h5v5M19 5l-9 9M11 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // ignore clipboard failures
  }
}

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
  const progress = kb ? getKnowledgeIndexingProgress(kb) : null;
  const autoReview = useRepoAutoReview({
    owner: repository.owner,
    repo: repository.name,
    defaultBranch: repository.defaultBranch,
    enabled: isReady,
  });

  const statusLabel = (() => {
    if (indexing || actionStatus === "importing" || actionStatus === "syncing") {
      if (progress?.hasTotals) {
        return `Indexing ${progress.percent}%`;
      }
      return actionStatus === "syncing" ? "Syncing" : "Starting";
    }
    if (isReady) {
      return "Ready";
    }
    if (kb?.status === "failed") {
      return "Failed";
    }
    return repository.visibility;
  })();

  const statusTone = isReady
    ? "ready"
    : kb?.status === "failed"
      ? "failed"
      : indexing || actionStatus !== "idle"
        ? "busy"
        : "neutral";

  return (
    <article
      className="github-repo-card"
      aria-label={`${repository.name}, ${statusLabel}`}
    >
      <header className="github-repo-card__header">
        <div className="github-repo-card__header-left">
          <span className="github-repo-card__icon" aria-hidden="true">
            <IconGitHub />
          </span>
          <span
            className={`github-repo-card__badge github-repo-card__badge--${statusTone}`}
          >
            <span className="github-repo-card__badge-dot" aria-hidden="true" />
            {statusLabel}
          </span>
        </div>
        <div className="github-repo-card__header-right">
          <span className="github-repo-card__star-chip" title="Stars">
            <IconStar />
            {repository.stargazersCount}
          </span>
          <button
            type="button"
            className="github-repo-card__icon-btn"
            aria-label="View repository details"
            onClick={() => onViewDetails(repository)}
          >
            <span aria-hidden="true">⋯</span>
          </button>
        </div>
      </header>

      <div className="github-repo-card__identity">
        <h3 className="github-repo-card__title" title={repository.name}>
          {repository.name}
        </h3>
        <button
          type="button"
          className="github-repo-card__owner"
          title="Copy owner"
          onClick={() => {
            void copyText(repository.owner);
          }}
        >
          {repository.owner}
          <span aria-hidden="true">⧉</span>
        </button>
        <p
          className="github-repo-card__description"
          title={repository.description ?? undefined}
        >
          {repository.description || "No description provided."}
        </p>
      </div>

      <div className="github-repo-card__stats" aria-label="Repository stats">
        <div className="github-repo-card__stat">
          <IconCode />
          <strong>{repository.language ?? "Unknown"}</strong>
          <span>Language</span>
        </div>
        <div className="github-repo-card__stat">
          <IconStar />
          <strong>{repository.stargazersCount}</strong>
          <span>Stars</span>
        </div>
        <div className="github-repo-card__stat">
          <IconFork />
          <strong>{repository.forksCount}</strong>
          <span>Forks</span>
        </div>
        <div className="github-repo-card__stat">
          <IconBranch />
          <strong>{repository.defaultBranch}</strong>
          <span>Default Branch</span>
        </div>
        <div className="github-repo-card__stat">
          <IconClock />
          <strong>{formatGithubUpdatedAt(repository.updatedAt)}</strong>
          <span>Updated</span>
        </div>
        <div className="github-repo-card__stat">
          <IconChunks />
          <strong>{isReady ? kb?.chunkCount ?? 0 : "—"}</strong>
          <span>Chunks</span>
        </div>
      </div>

      {isReady ? (
        <div className="github-repo-card__status-bar">
          <span className="github-repo-card__status-auto">
            <IconBot />
            {autoReview.autoReview?.enabled
              ? `Auto: ${autoReview.autoReview.targetBranch || autoReview.selectedBranch}`
              : "Auto: off"}
          </span>
          <span className="github-repo-card__status-meta">
            <span>Latest commit</span>
            <span className="github-repo-card__chunks-pill">
              {kb?.chunkCount ?? 0} chunks
            </span>
          </span>
        </div>
      ) : null}

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
        </div>
      ) : null}

      {knowledge?.error || kb?.errorMessage ? (
        <p className="github-repo-box__error">
          {knowledge?.error || kb?.errorMessage}
        </p>
      ) : null}

      {isReady ? (
        <GithubRepoAutoReviewControls
          enabled={Boolean(autoReview.autoReview?.enabled)}
          selectedBranch={autoReview.selectedBranch}
          branches={autoReview.branches}
          isConfigLoading={autoReview.isConfigLoading}
          isBranchesLoading={autoReview.isBranchesLoading}
          isSaving={autoReview.isSaving}
          disabled={isBusy}
          onToggle={(nextEnabled) => {
            void autoReview.toggle(nextEnabled);
          }}
          onBranchChange={(branch) => {
            void autoReview.changeBranch(branch);
          }}
          onLoadBranches={() => {
            void autoReview.ensureBranchesLoaded();
          }}
        />
      ) : null}

      <div className="github-repo-card__actions">
        <button
          type="button"
          className="github-repo-card__action"
          onClick={() => onViewDetails(repository)}
        >
          <IconEye />
          View Details
        </button>
        <button
          type="button"
          className="github-repo-card__action"
          disabled={!canSync}
          onClick={() => onSync(repository)}
        >
          <IconSync />
          {actionStatus === "syncing" || indexing
            ? "Working…"
            : "Sync Repository"}
        </button>
        {!kb || actionStatus === "importing" ? (
          <button
            type="button"
            className="github-repo-card__action github-repo-card__action--primary"
            disabled={!canImport}
            onClick={() => onImport(repository)}
          >
            <IconSync />
            {actionStatus === "importing" ? "Starting…" : "Import"}
          </button>
        ) : (
          <button
            type="button"
            className="github-repo-card__action github-repo-card__action--primary"
            disabled={!isReady}
            onClick={() => onOpenChat(repository)}
          >
            <IconChat />
            {indexing
              ? progress?.hasTotals
                ? `${progress.percent}%`
                : "Indexing…"
              : "Open Chat"}
          </button>
        )}
        <button
          type="button"
          className="github-repo-card__action"
          disabled={!isReady}
          onClick={() => onOpenPullRequests(repository)}
        >
          <IconPr />
          Pull Requests
        </button>
      </div>

      <a
        className="github-repo-card__external"
        href={repository.htmlUrl}
        target="_blank"
        rel="noreferrer"
      >
        Open in GitHub
        <IconExternal />
      </a>
    </article>
  );
}
