import type { GithubConnectionHeaderProps } from "@/features/github/types/github.components";
import { formatConnectedAt } from "@/features/github/utils/githubFormat";

export function GithubConnectionHeader({
  connection,
  isDisconnecting,
  onDisconnect,
}: GithubConnectionHeaderProps) {
  const connectedAt = formatConnectedAt(connection.connectedAt);

  return (
    <div className="github-connection">
      <div className="github-connection__identity">
        {connection.avatar ? (
          <img
            className="github-connection__avatar"
            src={connection.avatar}
            alt={`${connection.username ?? "GitHub"} avatar`}
            width={48}
            height={48}
          />
        ) : (
          <span className="github-connection__avatar github-connection__avatar--fallback">
            {(connection.username ?? "G").charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <div className="github-connection__name-row">
            <strong>{connection.username ?? "GitHub user"}</strong>
            <span className="status status--active">Connected</span>
          </div>
          {connection.name ? <p>{connection.name}</p> : null}
          {connectedAt ? <small>Connected {connectedAt}</small> : null}
        </div>
      </div>
      <button
        type="button"
        className="button button--secondary"
        disabled={isDisconnecting}
        onClick={onDisconnect}
      >
        {isDisconnecting ? "Disconnecting…" : "Disconnect"}
      </button>
    </div>
  );
}
