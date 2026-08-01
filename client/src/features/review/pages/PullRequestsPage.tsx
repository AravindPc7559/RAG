import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { paths, createPullRequestPath, createPullRequestsPath } from "@/app/router/paths";
import { reviewApi } from "@/features/review/api/reviewApi";
import type { ReviewPullRequest } from "@/features/review/types/review.types";
import { toApiErrorPayload } from "@/services/apiErrors";
import { useToast } from "@/shared/hooks/useToast";

type PullStateFilter = "open" | "closed" | "all";

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PullRequestsPage() {
  const { owner = "", repo = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [stateFilter, setStateFilter] = useState<PullStateFilter>("open");
  const [pullRequests, setPullRequests] = useState<ReviewPullRequest[]>([]);
  const [fullName, setFullName] = useState(`${owner}/${repo}`);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!owner || !repo) {
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const result = await reviewApi.listPullRequests(owner, repo, {
        state: stateFilter,
      });
      setPullRequests(result.pullRequests);
      setFullName(result.fullName || `${owner}/${repo}`);
      setStatus("ready");
    } catch (loadError) {
      const payload = toApiErrorPayload(loadError);
      setError(payload.message);
      setStatus("failed");
      showToast(payload.message, "error");
    }
  }, [owner, repo, showToast, stateFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!owner || !repo) {
    return (
      <section className="documents-page">
        <div className="document-library__empty">
          <p>Repository is required.</p>
          <Link className="button button--secondary" to={paths.github}>
            Back to GitHub
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="documents-page review-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Pull requests</span>
          <h1>{fullName}</h1>
          <p>
            Review open changes against this repository&apos;s knowledge base,
            then publish selected comments to GitHub.
          </p>
        </div>
        <div className="github-page__heading-actions">
          <Link
            className="button button--secondary button--compact"
            to={paths.github}
          >
            Back to repos
          </Link>
        </div>
      </header>

      <div className="review-toolbar">
        <div className="review-toolbar__filters" role="group" aria-label="PR state">
          {(["open", "closed", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={
                stateFilter === value
                  ? "button button--secondary button--compact is-active"
                  : "button button--ghost-dark button--compact"
              }
              onClick={() => setStateFilter(value)}
            >
              {value[0]!.toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="button button--secondary button--compact"
          onClick={() => void load()}
          disabled={status === "loading"}
        >
          Refresh
        </button>
      </div>

      {status === "loading" ? (
        <div className="document-library__empty">
          <p>Loading pull requests…</p>
        </div>
      ) : null}

      {status === "failed" ? (
        <div className="document-library__empty">
          <p>{error || "Unable to load pull requests."}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" && pullRequests.length === 0 ? (
        <div className="document-library__empty">
          <p>No {stateFilter === "all" ? "" : `${stateFilter} `}pull requests found.</p>
          <Link
            className="button button--secondary"
            to={createPullRequestsPath(owner, repo)}
            onClick={(event) => {
              event.preventDefault();
              setStateFilter("open");
            }}
          >
            Show open
          </Link>
        </div>
      ) : null}

      {status === "ready" && pullRequests.length > 0 ? (
        <ul className="review-pr-list">
          {pullRequests.map((pullRequest) => (
            <li key={pullRequest.id}>
              <button
                type="button"
                className="review-pr-card"
                onClick={() =>
                  navigate(
                    createPullRequestPath(owner, repo, pullRequest.number),
                  )
                }
              >
                <div className="review-pr-card__top">
                  <strong>
                    #{pullRequest.number} {pullRequest.title}
                  </strong>
                  <span
                    className={
                      pullRequest.state === "open"
                        ? "status status--active"
                        : "status"
                    }
                  >
                    {pullRequest.draft ? "Draft" : pullRequest.state}
                  </span>
                </div>
                <div className="review-pr-card__meta">
                  <span>@{pullRequest.authorLogin}</span>
                  <span>
                    {pullRequest.baseRef} ← {pullRequest.headRef}
                  </span>
                  <span>Updated {formatUpdatedAt(pullRequest.updatedAt)}</span>
                </div>
                {pullRequest.labels.length > 0 ? (
                  <div className="review-pr-card__labels">
                    {pullRequest.labels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
