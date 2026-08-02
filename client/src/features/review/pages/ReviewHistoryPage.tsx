import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createReviewRunPath, paths } from "@/app/router/paths";
import { reviewApi } from "@/features/review/api/reviewApi";
import type {
  ReviewHistoryStats,
  ReviewRunSource,
  ReviewRunStatus,
  ReviewRunSummary,
} from "@/features/review/types/review.types";
import { toApiErrorPayload } from "@/services/apiErrors";
import { useToast } from "@/shared/hooks/useToast";

type SourceFilter = "all" | ReviewRunSource;
type StatusFilter = "all" | ReviewRunStatus;

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: ReviewRunStatus) {
  if (status === "no_comments") {
    return "No comments";
  }
  return status[0]!.toUpperCase() + status.slice(1);
}

function parseRepoFilter(value: string): { owner?: string; repo?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  const [owner, repo] = trimmed.split("/");
  if (owner && repo) {
    return { owner, repo };
  }
  return { owner: trimmed };
}

export function ReviewHistoryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [repoFilter, setRepoFilter] = useState("");
  const [runs, setRuns] = useState<ReviewRunSummary[]>([]);
  const [stats, setStats] = useState<ReviewHistoryStats | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    const repoQuery = parseRepoFilter(repoFilter);

    try {
      const [history, nextStats] = await Promise.all([
        reviewApi.listHistory({
          ...(repoQuery.owner ? { owner: repoQuery.owner } : {}),
          ...(repoQuery.repo ? { repo: repoQuery.repo } : {}),
          ...(sourceFilter !== "all" ? { source: sourceFilter } : {}),
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          perPage: 30,
        }),
        reviewApi.getStats(),
      ]);
      setRuns(history.runs);
      setStats(nextStats);
      setStatus("ready");
    } catch (loadError) {
      const payload = toApiErrorPayload(loadError);
      setError(payload.message);
      setStatus("failed");
      showToast(payload.message, "error");
    }
  }, [repoFilter, showToast, sourceFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDayCount = useMemo(() => {
    if (!stats?.last7Days.length) {
      return 1;
    }
    return Math.max(1, ...stats.last7Days.map((day) => day.count));
  }, [stats]);

  return (
    <section className="documents-page review-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Reviews</span>
          <h1>Review history</h1>
          <p>
            Comments from Generate review and auto-review are saved here, then
            updated when you publish to GitHub.
          </p>
        </div>
        <div className="github-page__heading-actions">
          <Link
            className="button button--secondary button--compact"
            to={paths.github}
          >
            Open GitHub
          </Link>
        </div>
      </header>

      {stats ? (
        <div className="review-stats" aria-label="Review statistics">
          <div className="review-stats__grid">
            <div className="review-stats__stat">
              <strong>{stats.totalRuns}</strong>
              <span>Total runs</span>
            </div>
            <div className="review-stats__stat">
              <strong>{stats.generatedCount}</strong>
              <span>Generated</span>
            </div>
            <div className="review-stats__stat">
              <strong>{stats.publishedCount}</strong>
              <span>Published</span>
            </div>
            <div className="review-stats__stat">
              <strong>{stats.commentsGenerated}</strong>
              <span>Comments saved</span>
            </div>
            <div className="review-stats__stat">
              <strong>{stats.manualCount}</strong>
              <span>Manual</span>
            </div>
            <div className="review-stats__stat">
              <strong>{stats.autoCount}</strong>
              <span>Auto</span>
            </div>
          </div>

          <div className="review-stats__panels">
            <div className="review-stats__panel">
              <h2>Last 7 days</h2>
              <div className="review-stats__bars" aria-label="Runs by day">
                {stats.last7Days.map((day) => (
                  <div key={day.date} className="review-stats__bar-item">
                    <div className="review-stats__bar-track">
                      <span
                        className="review-stats__bar-fill"
                        style={{
                          height: `${Math.max(
                            8,
                            Math.round((day.count / maxDayCount) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                    <strong>{day.count}</strong>
                    <span>{day.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="review-stats__panel">
              <h2>Severity totals</h2>
              <ul className="review-stats__severity">
                <li>
                  <span>Important</span>
                  <strong>{stats.severityTotals.important}</strong>
                </li>
                <li>
                  <span>Warning</span>
                  <strong>{stats.severityTotals.warning}</strong>
                </li>
                <li>
                  <span>Info</span>
                  <strong>{stats.severityTotals.info}</strong>
                </li>
              </ul>
              {stats.topRepos.length ? (
                <>
                  <h2>Top repositories</h2>
                  <ul className="review-stats__repos">
                    {stats.topRepos.map((item) => (
                      <li key={`${item.owner}/${item.repo}`}>
                        <span>
                          {item.owner}/{item.repo}
                        </span>
                        <strong>{item.count}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="review-toolbar">
        <div
          className="review-toolbar__filters"
          role="group"
          aria-label="Source filter"
        >
          {(
            [
              ["all", "All"],
              ["manual", "Manual"],
              ["auto", "Auto"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                sourceFilter === value
                  ? "button button--secondary button--compact is-active"
                  : "button button--ghost-dark button--compact"
              }
              onClick={() => setSourceFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="review-toolbar__filters"
          role="group"
          aria-label="Status filter"
        >
          {(
            [
              ["all", "Any status"],
              ["generated", "Generated"],
              ["published", "Published"],
              ["no_comments", "No comments"],
              ["failed", "Failed"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                statusFilter === value
                  ? "button button--secondary button--compact is-active"
                  : "button button--ghost-dark button--compact"
              }
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="review-history__repo-filter">
          <span className="visually-hidden">Filter by repository</span>
          <input
            type="search"
            placeholder="owner/repo"
            value={repoFilter}
            onChange={(event) => setRepoFilter(event.target.value)}
          />
        </label>
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
        <p className="document-library__empty">Loading review history…</p>
      ) : null}

      {status === "failed" ? (
        <div className="document-library__empty">
          <p>{error || "Unable to load review history."}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" && runs.length === 0 ? (
        <div className="document-library__empty">
          <p>
            No saved reviews yet. Use Generate review on a PR, or enable
            auto-review, to store comments here.
          </p>
          <Link className="button button--secondary" to={paths.github}>
            Browse repositories
          </Link>
        </div>
      ) : null}

      {status === "ready" && runs.length > 0 ? (
        <ul className="review-pr-list">
          {runs.map((run) => (
            <li key={run.runId}>
              <button
                type="button"
                className="review-pr-card"
                onClick={() => navigate(createReviewRunPath(run.runId))}
              >
                <div className="review-pr-card__top">
                  <strong>
                    {run.owner}/{run.repo} #{run.prNumber}
                  </strong>
                  <span
                    className={`review-history__badge review-history__badge--${run.status}`}
                  >
                    {statusLabel(run.status)}
                  </span>
                  <span className="review-history__badge">
                    {run.source === "auto" ? "Auto" : "Manual"}
                  </span>
                </div>
                <p className="review-history__title">{run.prTitle}</p>
                <div className="review-pr-card__meta">
                  <span>{run.commentCount} comments</span>
                  <span>
                    {run.severityCounts.important} important ·{" "}
                    {run.severityCounts.warning} warning ·{" "}
                    {run.severityCounts.info} info
                  </span>
                  <span>{formatWhen(run.createdAt)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
