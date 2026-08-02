import type { GithubEmptyStateProps } from "@/features/github/types/github.components";

export function GithubEmptyState({
  onConnect,
  isConnecting = false,
}: GithubEmptyStateProps) {
  return (
    <div className="document-library__empty github-empty">
      <span className="github-empty__logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
        </svg>
      </span>
      <h2>Connect GitHub</h2>
      <p>
        Connect your GitHub account to import repositories and enable AI-powered
        code analysis.
      </p>
      <button
        type="button"
        className="button button--primary"
        disabled={isConnecting}
        onClick={onConnect}
      >
        {isConnecting ? "Redirecting…" : "Connect GitHub"}
      </button>
    </div>
  );
}
