import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createPullRequestPath,
  paths,
} from "@/app/router/paths";
import { reviewApi } from "@/features/review/api/reviewApi";
import type { ReviewRunDetail } from "@/features/review/types/review.types";
import { toApiErrorPayload } from "@/services/apiErrors";
import { useToast } from "@/shared/hooks/useToast";

function formatWhen(value: string) {
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

function statusLabel(status: ReviewRunDetail["status"]) {
  if (status === "no_comments") {
    return "No comments";
  }
  return status[0]!.toUpperCase() + status.slice(1);
}

export function ReviewRunDetailPage() {
  const { runId = "" } = useParams();
  const { showToast } = useToast();
  const [run, setRun] = useState<ReviewRunDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!runId) {
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const detail = await reviewApi.getHistoryRun(runId);
      setRun(detail);
      setStatus("ready");
    } catch (loadError) {
      const payload = toApiErrorPayload(loadError);
      setError(payload.message);
      setStatus("failed");
      showToast(payload.message, "error");
    }
  }, [runId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!runId) {
    return (
      <section className="documents-page">
        <div className="document-library__empty">
          <p>Review run id is required.</p>
          <Link className="button button--secondary" to={paths.reviews}>
            Back to history
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="documents-page review-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Review run</span>
          <h1>
            {run
              ? `${run.owner}/${run.repo} #${run.prNumber}`
              : "Loading run…"}
          </h1>
          <p>
            {run
              ? run.prTitle
              : "Inspect generated comments and publish details."}
          </p>
        </div>
        <div className="github-page__heading-actions">
          <Link
            className="button button--secondary button--compact"
            to={paths.reviews}
          >
            Back to history
          </Link>
          {run ? (
            <Link
              className="button button--secondary button--compact"
              to={createPullRequestPath(run.owner, run.repo, run.prNumber)}
            >
              Open PR review
            </Link>
          ) : null}
          {run?.htmlUrl ? (
            <a
              className="button button--primary button--compact"
              href={run.htmlUrl}
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub
            </a>
          ) : null}
        </div>
      </header>

      {status === "loading" ? (
        <p className="document-library__empty">Loading review run…</p>
      ) : null}

      {status === "failed" ? (
        <div className="document-library__empty">
          <p>{error || "Unable to load this review run."}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" && run ? (
        <div className="review-run-detail">
          <div className="review-pr-meta">
            <span
              className={`review-history__badge review-history__badge--${run.status}`}
            >
              {statusLabel(run.status)}
            </span>
            <span className="review-history__badge">
              {run.source === "auto" ? "Auto" : "Manual"}
            </span>
            <span>{run.commentCount} comments</span>
            <span>{formatWhen(run.createdAt)}</span>
            <span>SHA {run.headSha.slice(0, 7)}</span>
          </div>

          {run.errorMessage ? (
            <div className="review-run-detail__error">
              <strong>Error</strong>
              <p>{run.errorMessage}</p>
            </div>
          ) : null}

          {run.summaryBody ? (
            <div className="review-panel">
              <h2>Summary</h2>
              <p>{run.summaryBody}</p>
            </div>
          ) : null}

          <div className="review-layout">
            <div className="review-panel">
              <h2>Comments ({run.comments.length})</h2>
              {run.comments.length === 0 ? (
                <p className="review-panel__empty">No comments on this run.</p>
              ) : (
                <ul className="review-run-detail__comments">
                  {run.comments.map((comment, index) => (
                    <li key={`${comment.path}:${comment.line}:${index}`}>
                      <div className="review-run-detail__comment-meta">
                        <strong>
                          {comment.path}:{comment.line}
                        </strong>
                        <span className="review-history__badge">
                          {comment.severity}
                        </span>
                        <span>{comment.side}</span>
                      </div>
                      <p>{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="review-panel">
              <h2>Files</h2>
              <p>
                Analyzed <strong>{run.analyzedFiles.length}</strong> · Skipped{" "}
                <strong>{run.skippedFiles.length}</strong>
              </p>
              {run.analyzedFiles.length ? (
                <>
                  <h3>Analyzed</h3>
                  <ul className="review-run-detail__files">
                    {run.analyzedFiles.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {run.skippedFiles.length ? (
                <>
                  <h3>Skipped</h3>
                  <ul className="review-run-detail__files">
                    {run.skippedFiles.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
