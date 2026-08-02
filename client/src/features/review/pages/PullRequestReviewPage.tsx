import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createPullRequestsPath,
  paths,
} from "@/app/router/paths";
import { reviewApi } from "@/features/review/api/reviewApi";
import type {
  ReviewDraftComment,
  ReviewPullRequest,
  ReviewPullRequestFile,
} from "@/features/review/types/review.types";
import { getSeverityClassName } from "@/features/review/utils/reviewFormat";
import { toApiErrorPayload } from "@/services/apiErrors";
import { useToast } from "@/shared/hooks/useToast";

export function PullRequestReviewPage() {
  const { owner = "", repo = "", number: numberParam = "" } = useParams();
  const pullNumber = Number(numberParam);
  const { showToast } = useToast();

  const [pullRequest, setPullRequest] = useState<ReviewPullRequest | null>(
    null,
  );
  const [files, setFiles] = useState<ReviewPullRequestFile[]>([]);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [comments, setComments] = useState<ReviewDraftComment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analyzedFiles, setAnalyzedFiles] = useState<string[]>([]);
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  const [summaryBody, setSummaryBody] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const load = useCallback(async () => {
    if (!owner || !repo || !Number.isInteger(pullNumber) || pullNumber < 1) {
      return;
    }

    setLoadStatus("loading");
    setLoadError(null);

    try {
      const detail = await reviewApi.getPullRequest(owner, repo, pullNumber);
      setPullRequest(detail.pullRequest);
      setFiles(detail.files);
      setLoadStatus("ready");
    } catch (error) {
      const payload = toApiErrorPayload(error);
      setLoadError(payload.message);
      setLoadStatus("failed");
      showToast(payload.message, "error");
    }
  }, [owner, pullNumber, repo, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedComments = useMemo(
    () => comments.filter((comment) => selectedIds.has(comment.id)),
    [comments, selectedIds],
  );

  async function handleAnalyze() {
    if (!owner || !repo || !Number.isInteger(pullNumber)) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await reviewApi.analyzePullRequest(
        owner,
        repo,
        pullNumber,
      );
      setComments(result.comments);
      setSelectedIds(new Set(result.comments.map((comment) => comment.id)));
      setAnalyzedFiles(result.analyzedFiles);
      setSkippedFiles(result.skippedFiles);
      setHasAnalyzed(true);

      if (!result.comments.length) {
        showToast("No review comments generated for this pull request.", "info");
      } else {
        showToast(
          `Generated ${result.comments.length} draft comment${
            result.comments.length === 1 ? "" : "s"
          }.`,
          "success",
        );
      }
    } catch (error) {
      showToast(toApiErrorPayload(error).message, "error");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handlePublish() {
    if (!owner || !repo || !pullRequest) {
      return;
    }

    if (!selectedComments.length) {
      showToast("Select at least one comment to publish.", "error");
      return;
    }

    setIsPublishing(true);
    try {
      const result = await reviewApi.publishReview(
        owner,
        repo,
        pullRequest.number,
        {
          body: summaryBody.trim() || undefined,
          comments: selectedComments.map((comment) => ({
            path: comment.path,
            line: comment.line,
            side: comment.side,
            body: comment.body,
          })),
        },
      );

      showToast(
        `Published ${result.publishedCount} comment${
          result.publishedCount === 1 ? "" : "s"
        } to GitHub.`,
        "success",
      );

      if (result.htmlUrl) {
        window.open(result.htmlUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      showToast(toApiErrorPayload(error).message, "error");
    } finally {
      setIsPublishing(false);
    }
  }

  function toggleComment(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (!owner || !repo || !Number.isInteger(pullNumber) || pullNumber < 1) {
    return (
      <section className="documents-page">
        <div className="document-library__empty">
          <p>Invalid pull request.</p>
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
          <span className="eyebrow">
            {owner}/{repo}
          </span>
          <h1>
            {pullRequest
              ? `#${pullRequest.number} ${pullRequest.title}`
              : `Pull request #${pullNumber}`}
          </h1>
          <p>
            Generate a knowledge-base grounded review, preview comments, then
            publish the ones you approve.
          </p>
        </div>
        <div className="github-page__heading-actions">
          <Link
            className="button button--secondary button--compact"
            to={createPullRequestsPath(owner, repo)}
          >
            All PRs
          </Link>
          {pullRequest ? (
            <a
              className="button button--ghost-dark button--compact"
              href={pullRequest.htmlUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open on GitHub
            </a>
          ) : null}
        </div>
      </header>

      {loadStatus === "loading" ? (
        <div className="document-library__empty">
          <p>Loading pull request…</p>
        </div>
      ) : null}

      {loadStatus === "failed" ? (
        <div className="document-library__empty">
          <p>{loadError || "Unable to load pull request."}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {loadStatus === "ready" && pullRequest ? (
        <>
          <div className="review-pr-meta">
            <span>@{pullRequest.authorLogin}</span>
            <span>
              {pullRequest.baseRef} ← {pullRequest.headRef}
            </span>
            <span>
              {files.length} changed file{files.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="review-layout">
            <section className="review-panel">
              <div className="review-panel__header">
                <h2>Changed files</h2>
                <button
                  type="button"
                  className="button button--primary button--compact"
                  disabled={isAnalyzing || isPublishing}
                  onClick={() => void handleAnalyze()}
                >
                  {isAnalyzing ? "Generating…" : "Generate review"}
                </button>
              </div>
              <ul className="review-file-list">
                {files.map((file) => (
                  <li key={file.filename}>
                    <div className="review-file-list__row">
                      <strong>{file.filename}</strong>
                      <span>
                        +{file.additions} / -{file.deletions}
                      </span>
                    </div>
                    {file.patchPreview ? (
                      <pre className="review-file-list__patch">
                        {file.patchPreview}
                      </pre>
                    ) : (
                      <p className="review-file-list__empty">
                        {file.hasPatch
                          ? "Patch unavailable"
                          : "Binary or empty patch — skipped in analysis"}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="review-panel">
              <div className="review-panel__header">
                <h2>Draft comments</h2>
                <button
                  type="button"
                  className="button button--secondary button--compact"
                  disabled={
                    isPublishing ||
                    isAnalyzing ||
                    selectedComments.length === 0
                  }
                  onClick={() => void handlePublish()}
                >
                  {isPublishing
                    ? "Publishing…"
                    : `Publish to GitHub (${selectedComments.length})`}
                </button>
              </div>

              {!hasAnalyzed ? (
                <div className="document-library__empty">
                  <p>
                    Run Generate review to draft comments grounded in this
                    repository&apos;s knowledge base.
                  </p>
                </div>
              ) : null}

              {hasAnalyzed && comments.length === 0 ? (
                <div className="document-library__empty">
                  <p>No comments were generated for the analyzed files.</p>
                  {skippedFiles.length > 0 ? (
                    <p>
                      Skipped {skippedFiles.length} file
                      {skippedFiles.length === 1 ? "" : "s"} without usable
                      patches.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {comments.length > 0 ? (
                <>
                  <label className="review-summary">
                    <span>Review summary (optional)</span>
                    <textarea
                      value={summaryBody}
                      onChange={(event) => setSummaryBody(event.target.value)}
                      rows={3}
                      placeholder="Posted with the selected line comments on GitHub"
                    />
                  </label>
                  <p className="review-panel__hint">
                    Analyzed {analyzedFiles.length} file
                    {analyzedFiles.length === 1 ? "" : "s"}
                    {skippedFiles.length
                      ? ` · skipped ${skippedFiles.length}`
                      : ""}
                    . Nothing is posted until you publish.
                  </p>
                  <ul className="review-comment-list">
                    {comments.map((comment) => (
                      <li key={comment.id} className="review-comment">
                        <label className="review-comment__select">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(comment.id)}
                            onChange={() => toggleComment(comment.id)}
                          />
                          <span className={getSeverityClassName(comment.severity)}>
                            {comment.severity}
                          </span>
                          <strong>
                            {comment.path}:{comment.line}
                          </strong>
                        </label>
                        <p>{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
