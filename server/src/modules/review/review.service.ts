import OpenAI from "openai";

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AutoReviewConfigRepository } from "./review.auto-config.repository.js";
import {
  AUTO_REVIEW_SUMMARY,
  DEFAULT_REVIEW_SUMMARY,
  MAX_CHANGED_FILES,
  MAX_COMMENTS,
  MAX_CONTEXT_CHUNKS_PER_FILE,
  MAX_PATCH_CHARS,
  MAX_RETRIEVAL_CONCURRENCY,
  PATCH_PREVIEW_CHARS,
  REVIEW_LLM_MODEL,
} from "./review.constants.js";
import type { ReviewJobRepository } from "./review.job.repository.js";
import { extractRightSideLines, truncatePatch } from "./review.patch.js";
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from "./review.prompts.js";
import type { ReviewRunDocument } from "./review.run.model.js";
import type { ReviewRunRepository } from "./review.run.repository.js";
import type {
  AnalyzeReviewMeta,
  AnalyzeReviewResult,
  AutoReviewConfigView,
  GithubPrPort,
  KnowledgeLookupPort,
  LlmComment,
  PublishReviewCommentInput,
  PublishReviewMeta,
  PublishReviewResult,
  RetrievalPort,
  ReviewHistoryStats,
  ReviewPullRequestDetail,
  ReviewRunDetail,
  ReviewRunSource,
  ReviewRunStatus,
  ReviewRunSummary,
  UpdateAutoReviewInput,
} from "./review.types.js";
import {
  buildGithubWebhookUrl,
  buildRetrievalQuery,
  countSeverities,
  formatContextChunks,
  mapWithConcurrency,
  normalizeDraftComments,
  normalizeSeverity,
  parseLlmCommentsJson,
  preferMatchingChunks,
  toAutoReviewConfigView,
} from "./review.utils.js";
import { parsePullRequestWebhookPayload } from "./review.webhook.js";

function toReviewRunSummary(document: ReviewRunDocument): ReviewRunSummary {
  return {
    runId: document.runId,
    knowledgeBaseId: document.knowledgeBaseId,
    owner: document.owner,
    repo: document.repo,
    prNumber: document.prNumber,
    headSha: document.headSha,
    prTitle: document.prTitle,
    source: document.source,
    status: document.status,
    ...(document.jobId ? { jobId: document.jobId } : {}),
    ...(typeof document.githubReviewId === "number"
      ? { githubReviewId: document.githubReviewId }
      : {}),
    ...(document.htmlUrl ? { htmlUrl: document.htmlUrl } : {}),
    ...(document.githubState ? { githubState: document.githubState } : {}),
    publishedCount: document.publishedCount,
    commentCount: document.comments.length,
    analyzedFiles: document.analyzedFiles,
    skippedFiles: document.skippedFiles,
    ...(document.summaryBody ? { summaryBody: document.summaryBody } : {}),
    ...(document.errorMessage ? { errorMessage: document.errorMessage } : {}),
    severityCounts: document.severityCounts,
    createdAt: document.createdAt.toISOString(),
    finishedAt: document.finishedAt.toISOString(),
  };
}

function toReviewRunDetail(document: ReviewRunDocument): ReviewRunDetail {
  return {
    ...toReviewRunSummary(document),
    comments: document.comments.map((comment) => ({
      path: comment.path,
      line: comment.line,
      side: comment.side,
      severity: comment.severity,
      body: comment.body,
    })),
  };
}

export class ReviewService {
  private openAIClient: OpenAI | null = null;

  constructor(
    private readonly github: GithubPrPort,
    private readonly knowledge: KnowledgeLookupPort,
    private readonly retrieval: RetrievalPort,
    private readonly autoReviewConfigs: AutoReviewConfigRepository,
    private readonly reviewJobs: ReviewJobRepository,
    private readonly reviewRuns: ReviewRunRepository,
  ) {}

  public async listPullRequests(
    userId: string,
    owner: string,
    repo: string,
    query: {
      state?: "open" | "closed" | "all";
      page?: number;
      perPage?: number;
    },
  ) {
    const knowledgeBase = await this.knowledge.getReadyKnowledgeBase(
      userId,
      owner,
      repo,
    );
    const accessToken = await this.github.getAccessToken(userId);
    const result = await this.github.listPullRequests(
      accessToken,
      owner,
      repo,
      query,
    );

    return {
      knowledgeBaseId: knowledgeBase.knowledgeBaseId,
      fullName: knowledgeBase.fullName,
      ...result,
    };
  }

  public async getPullRequestDetail(
    userId: string,
    owner: string,
    repo: string,
    number: number,
  ): Promise<ReviewPullRequestDetail> {
    const knowledgeBase = await this.knowledge.getReadyKnowledgeBase(
      userId,
      owner,
      repo,
    );
    const accessToken = await this.github.getAccessToken(userId);
    const [pullRequest, files] = await Promise.all([
      this.github.getPullRequest(accessToken, owner, repo, number),
      this.github.getPullRequestFiles(accessToken, owner, repo, number),
    ]);

    return {
      pullRequest,
      knowledgeBaseId: knowledgeBase.knowledgeBaseId,
      files: files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        hasPatch: Boolean(file.patch),
        ...(file.patch
          ? {
              patchPreview: truncatePatch(file.patch, PATCH_PREVIEW_CHARS),
            }
          : {}),
      })),
    };
  }

  public async analyzePullRequest(
    userId: string,
    owner: string,
    repo: string,
    number: number,
    meta: AnalyzeReviewMeta = {},
  ): Promise<AnalyzeReviewResult> {
    const knowledgeBase = await this.knowledge.getReadyKnowledgeBase(
      userId,
      owner,
      repo,
    );
    const accessToken = await this.github.getAccessToken(userId);
    const [pullRequest, files] = await Promise.all([
      this.github.getPullRequest(accessToken, owner, repo, number),
      this.github.getPullRequestFiles(accessToken, owner, repo, number),
    ]);

    const skippedFiles: string[] = [];
    const analyzable = files.filter((file) => {
      if (!file.patch) {
        skippedFiles.push(file.filename);
        return false;
      }
      return true;
    });

    if (analyzable.length > MAX_CHANGED_FILES) {
      for (const file of analyzable.slice(MAX_CHANGED_FILES)) {
        skippedFiles.push(file.filename);
      }
    }

    const included = analyzable.slice(0, MAX_CHANGED_FILES);
    const source = meta.source ?? "manual";
    const persist = meta.persist !== false;

    if (!included.length) {
      const emptyResult: AnalyzeReviewResult = {
        pullRequestNumber: number,
        knowledgeBaseId: knowledgeBase.knowledgeBaseId,
        prTitle: pullRequest.title,
        headSha: pullRequest.headSha,
        analyzedFiles: [],
        skippedFiles,
        comments: [],
      };

      if (persist) {
        const run = await this.reviewRuns.create({
          userId,
          knowledgeBaseId: knowledgeBase.knowledgeBaseId,
          owner,
          repo,
          prNumber: number,
          headSha: pullRequest.headSha,
          prTitle: pullRequest.title,
          source,
          status: "no_comments",
          ...(meta.jobId ? { jobId: meta.jobId } : {}),
          comments: [],
          analyzedFiles: [],
          skippedFiles,
          severityCounts: { info: 0, warning: 0, important: 0 },
        });
        emptyResult.runId = run.runId;
      }

      return emptyResult;
    }

    const fileContexts = await mapWithConcurrency(
      included,
      MAX_RETRIEVAL_CONCURRENCY,
      async (file) => {
        const patch = truncatePatch(file.patch!, MAX_PATCH_CHARS);
        const validLines = extractRightSideLines(patch);
        const chunks = await this.retrieval.retrieveContext({
          userId,
          knowledgeBaseId: knowledgeBase.knowledgeBaseId,
          query: buildRetrievalQuery({
            title: pullRequest.title,
            body: pullRequest.body,
            filename: file.filename,
            patch,
          }),
          limit: MAX_CONTEXT_CHUNKS_PER_FILE,
        });

        return {
          filename: file.filename,
          patch,
          validLines,
          context: formatContextChunks(
            preferMatchingChunks(
              chunks,
              file.filename,
              MAX_CONTEXT_CHUNKS_PER_FILE,
            ),
          ),
        };
      },
    );

    const rawComments = await this.generateComments({
      title: pullRequest.title,
      body: pullRequest.body,
      files: fileContexts.map((file) => ({
        filename: file.filename,
        patch: file.patch,
        context: file.context,
      })),
    });

    const comments = normalizeDraftComments(rawComments, fileContexts);
    const analyzedFiles = included.map((file) => file.filename);
    const result: AnalyzeReviewResult = {
      pullRequestNumber: number,
      knowledgeBaseId: knowledgeBase.knowledgeBaseId,
      prTitle: pullRequest.title,
      headSha: pullRequest.headSha,
      analyzedFiles,
      skippedFiles,
      comments,
    };

    if (persist) {
      const persistedComments = comments.map((comment) => ({
        path: comment.path,
        line: comment.line,
        side: comment.side,
        severity: comment.severity,
        body: comment.body,
      }));

      const run = await this.reviewRuns.create({
        userId,
        knowledgeBaseId: knowledgeBase.knowledgeBaseId,
        owner,
        repo,
        prNumber: number,
        headSha: pullRequest.headSha,
        prTitle: pullRequest.title,
        source,
        status: comments.length ? "generated" : "no_comments",
        ...(meta.jobId ? { jobId: meta.jobId } : {}),
        comments: persistedComments,
        analyzedFiles,
        skippedFiles,
        severityCounts: countSeverities(persistedComments),
      });
      result.runId = run.runId;
    }

    return result;
  }

  public async publishReview(
    userId: string,
    owner: string,
    repo: string,
    number: number,
    input: {
      body?: string;
      comments: PublishReviewCommentInput[];
    },
    meta: PublishReviewMeta = {},
  ): Promise<PublishReviewResult> {
    const knowledgeBase = await this.knowledge.getReadyKnowledgeBase(
      userId,
      owner,
      repo,
    );

    if (!input.comments?.length) {
      throw AppError.badRequest("Select at least one comment to publish.");
    }

    if (input.comments.length > MAX_COMMENTS) {
      throw AppError.badRequest(
        `You can publish at most ${MAX_COMMENTS} comments at once.`,
      );
    }

    for (const comment of input.comments) {
      if (!comment.path?.trim() || !comment.body?.trim()) {
        throw AppError.badRequest(
          "Each comment requires a file path and body.",
        );
      }
      if (!Number.isInteger(comment.line) || comment.line < 1) {
        throw AppError.badRequest("Each comment requires a valid line number.");
      }
    }

    const accessToken = await this.github.getAccessToken(userId);
    const pullRequest = await this.github.getPullRequest(
      accessToken,
      owner,
      repo,
      number,
    );

    const summaryBody = input.body?.trim() || DEFAULT_REVIEW_SUMMARY;
    const persistedComments = input.comments.map((comment) => ({
      path: comment.path.trim(),
      line: comment.line,
      side: (comment.side === "LEFT" ? "LEFT" : "RIGHT") as "LEFT" | "RIGHT",
      severity: normalizeSeverity(comment.severity),
      body: comment.body.trim(),
    }));

    const review = await this.github.createReview(
      accessToken,
      owner,
      repo,
      number,
      {
        commitId: pullRequest.headSha,
        body: summaryBody,
        comments: persistedComments.map((comment) => ({
          path: comment.path,
          body: comment.body,
          line: comment.line,
          side: comment.side,
        })),
      },
    );

    const htmlUrl = review.htmlUrl || pullRequest.htmlUrl;
    const severityCounts = countSeverities(persistedComments);

    let runId = meta.runId;
    if (runId) {
      const updated = await this.reviewRuns.markPublished(userId, runId, {
        githubReviewId: review.id,
        htmlUrl,
        githubState: review.state,
        publishedCount: persistedComments.length,
        comments: persistedComments,
        summaryBody,
        severityCounts,
      });
      if (!updated) {
        runId = undefined;
      }
    }

    if (!runId) {
      const existing = await this.reviewRuns.findLatestGeneratedForPr(
        userId,
        owner,
        repo,
        number,
        pullRequest.headSha,
      );
      if (existing) {
        const updated = await this.reviewRuns.markPublished(
          userId,
          existing.runId,
          {
            githubReviewId: review.id,
            htmlUrl,
            githubState: review.state,
            publishedCount: persistedComments.length,
            comments: persistedComments,
            summaryBody,
            severityCounts,
          },
        );
        runId = updated?.runId;
      }
    }

    if (!runId) {
      const created = await this.reviewRuns.create({
        userId,
        knowledgeBaseId: knowledgeBase.knowledgeBaseId,
        owner,
        repo,
        prNumber: number,
        headSha: pullRequest.headSha,
        prTitle: meta.prTitle?.trim() || pullRequest.title,
        source: meta.source ?? "manual",
        status: "published",
        ...(meta.jobId ? { jobId: meta.jobId } : {}),
        githubReviewId: review.id,
        htmlUrl,
        githubState: review.state,
        publishedCount: persistedComments.length,
        comments: persistedComments,
        analyzedFiles: meta.analyzedFiles ?? [],
        skippedFiles: meta.skippedFiles ?? [],
        summaryBody,
        severityCounts,
      });
      runId = created.runId;
    }

    return {
      reviewId: review.id,
      htmlUrl,
      state: review.state,
      publishedCount: persistedComments.length,
      runId,
    };
  }

  public async getAutoReviewConfig(
    userId: string,
    owner: string,
    repo: string,
  ): Promise<AutoReviewConfigView> {
    await this.knowledge.getReadyKnowledgeBase(userId, owner, repo);
    const config = await this.autoReviewConfigs.findByUserOwnerRepo(
      userId,
      owner,
      repo,
    );
    return toAutoReviewConfigView(config);
  }

  public async updateAutoReviewConfig(
    userId: string,
    owner: string,
    repo: string,
    input: UpdateAutoReviewInput,
  ): Promise<AutoReviewConfigView> {
    const knowledgeBase = await this.knowledge.getReadyKnowledgeBase(
      userId,
      owner,
      repo,
    );
    const targetBranch = input.targetBranch?.trim();
    if (!targetBranch) {
      throw AppError.badRequest("A target branch is required for auto-review.");
    }

    const existing = await this.autoReviewConfigs.findByUserOwnerRepo(
      userId,
      owner,
      repo,
    );
    const accessToken = await this.github.getAccessToken(userId);

    if (!input.enabled) {
      if (existing?.webhookId) {
        await this.github.deleteWebhook(
          accessToken,
          owner,
          repo,
          existing.webhookId,
        );
      }

      const disabled = await this.autoReviewConfigs.upsert({
        userId,
        knowledgeBaseId: knowledgeBase.knowledgeBaseId,
        githubRepoId: knowledgeBase.githubRepoId,
        owner,
        repo,
        enabled: false,
        targetBranch,
        webhookId: null,
        webhookActive: false,
      });

      return toAutoReviewConfigView(disabled);
    }

    if (!env.GITHUB_WEBHOOK_SECRET) {
      throw AppError.serviceUnavailable(
        "GITHUB_WEBHOOK_SECRET is required to enable auto-review. Add it to server/.env.",
      );
    }

    const webhookUrl = buildGithubWebhookUrl();
    let webhookId = existing?.webhookId ?? undefined;
    let webhookActive = false;

    if (webhookId) {
      const current = await this.github.getWebhook(
        accessToken,
        owner,
        repo,
        webhookId,
      );
      if (current) {
        webhookActive = current.active;
      } else {
        webhookId = undefined;
      }
    }

    if (!webhookId) {
      try {
        const created = await this.github.createWebhook(
          accessToken,
          owner,
          repo,
          {
            url: webhookUrl,
            secret: env.GITHUB_WEBHOOK_SECRET,
          },
        );
        webhookId = created.id;
        webhookActive = created.active;
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 403) {
          throw AppError.forbidden(
            "Need admin access on this repository to manage webhooks for auto-review.",
          );
        }
        throw error;
      }
    }

    const saved = await this.autoReviewConfigs.upsert({
      userId,
      knowledgeBaseId: knowledgeBase.knowledgeBaseId,
      githubRepoId: knowledgeBase.githubRepoId,
      owner,
      repo,
      enabled: true,
      targetBranch,
      webhookId,
      webhookActive,
    });

    return toAutoReviewConfigView(saved);
  }

  public async handleGithubWebhook(input: {
    rawBody: Buffer;
    signatureHeader?: string;
    eventName?: string;
    deliveryId?: string;
  }): Promise<{ accepted: boolean; enqueued: number }> {
    if (!env.GITHUB_WEBHOOK_SECRET) {
      throw AppError.serviceUnavailable(
        "GITHUB_WEBHOOK_SECRET is not configured.",
      );
    }

    const valid = this.github.verifyWebhookSignature(
      input.rawBody,
      input.signatureHeader,
      env.GITHUB_WEBHOOK_SECRET,
    );
    if (!valid) {
      throw AppError.unauthorized("Invalid GitHub webhook signature.");
    }

    const parsed = parsePullRequestWebhookPayload(
      input.rawBody,
      input.eventName,
    );
    if (!parsed) {
      return { accepted: true, enqueued: 0 };
    }

    const configs = await this.autoReviewConfigs.findEnabledByGithubRepoId(
      parsed.githubRepoId,
    );
    const matching = configs.filter(
      (config) => config.targetBranch === parsed.baseRef,
    );

    const outcomes = await Promise.all(
      matching.map(async (config) => {
        try {
          await this.knowledge.getReadyKnowledgeBase(
            String(config.userId),
            config.owner,
            config.repo,
          );
        } catch {
          logger.warn(
            {
              knowledgeBaseId: config.knowledgeBaseId,
              owner: config.owner,
              repo: config.repo,
            },
            "Skipping auto-review; knowledge base is not ready",
          );
          return false;
        }

        const job = await this.reviewJobs.enqueue({
          userId: String(config.userId),
          knowledgeBaseId: config.knowledgeBaseId,
          owner: config.owner,
          repo: config.repo,
          prNumber: parsed.prNumber,
          headSha: parsed.headSha,
          ...(input.deliveryId ? { deliveryId: input.deliveryId } : {}),
          action: parsed.action,
        });

        return Boolean(job);
      }),
    );

    return {
      accepted: true,
      enqueued: outcomes.filter(Boolean).length,
    };
  }

  public async processAutoReviewJob(job: {
    jobId: string;
    userId: string;
    owner: string;
    repo: string;
    prNumber: number;
    knowledgeBaseId?: string;
    headSha?: string;
  }): Promise<void> {
    const analysis = await this.analyzePullRequest(
      job.userId,
      job.owner,
      job.repo,
      job.prNumber,
      {
        source: "auto",
        jobId: job.jobId,
        persist: true,
      },
    );

    if (!analysis.comments.length) {
      logger.info(
        {
          jobId: job.jobId,
          owner: job.owner,
          repo: job.repo,
          prNumber: job.prNumber,
          runId: analysis.runId,
        },
        "Auto-review produced no comments",
      );
      return;
    }

    await this.publishReview(
      job.userId,
      job.owner,
      job.repo,
      job.prNumber,
      {
        body: AUTO_REVIEW_SUMMARY,
        comments: analysis.comments.map((comment) => ({
          path: comment.path,
          line: comment.line,
          side: comment.side,
          severity: comment.severity,
          body: comment.body,
        })),
      },
      {
        source: "auto",
        jobId: job.jobId,
        runId: analysis.runId,
        analyzedFiles: analysis.analyzedFiles,
        skippedFiles: analysis.skippedFiles,
        prTitle: analysis.prTitle,
      },
    );
  }

  public async recordFailedAutoReviewRun(input: {
    userId: string;
    knowledgeBaseId: string;
    owner: string;
    repo: string;
    prNumber: number;
    headSha: string;
    jobId: string;
    errorMessage: string;
    prTitle?: string;
  }): Promise<void> {
    try {
      await this.reviewRuns.create({
        userId: input.userId,
        knowledgeBaseId: input.knowledgeBaseId,
        owner: input.owner,
        repo: input.repo,
        prNumber: input.prNumber,
        headSha: input.headSha,
        prTitle: input.prTitle || `Pull request #${input.prNumber}`,
        source: "auto",
        status: "failed",
        jobId: input.jobId,
        publishedCount: 0,
        comments: [],
        analyzedFiles: [],
        skippedFiles: [],
        errorMessage: input.errorMessage,
        severityCounts: { info: 0, warning: 0, important: 0 },
      });
    } catch (error) {
      logger.error(
        { error, jobId: input.jobId },
        "Failed to persist failed auto-review run",
      );
    }
  }

  public async listReviewHistory(
    userId: string,
    query: {
      owner?: string;
      repo?: string;
      source?: ReviewRunSource;
      status?: ReviewRunStatus;
      page?: number;
      perPage?: number;
    },
  ) {
    const result = await this.reviewRuns.listForUser(userId, query);
    return {
      runs: result.runs.map(toReviewRunSummary),
      page: result.page,
      perPage: result.perPage,
      hasNextPage: result.hasNextPage,
      total: result.total,
    };
  }

  public async getReviewHistoryRun(
    userId: string,
    runId: string,
  ): Promise<ReviewRunDetail> {
    const run = await this.reviewRuns.findByRunIdForUser(userId, runId);
    if (!run) {
      throw AppError.notFound("Review run");
    }
    return toReviewRunDetail(run);
  }

  public async getReviewHistoryStats(
    userId: string,
  ): Promise<ReviewHistoryStats> {
    return this.reviewRuns.getStatsForUser(userId);
  }

  private async generateComments(input: {
    title: string;
    body: string | null;
    files: Array<{ filename: string; patch: string; context: string }>;
  }): Promise<LlmComment[]> {
    const openAI = this.getOpenAIClient();
    const response = await openAI.responses.create({
      model: REVIEW_LLM_MODEL,
      input: [
        {
          role: "system",
          content: buildReviewSystemPrompt(),
        },
        {
          role: "user",
          content: buildReviewUserPrompt(input),
        },
      ],
    });

    return parseLlmCommentsJson(response.output_text?.trim() ?? "[]");
  }

  private getOpenAIClient() {
    if (!env.OPENAI_API_KEY) {
      throw AppError.serviceUnavailable(
        "OPENAI_API_KEY is required for pull request review. Add it to server/.env.",
      );
    }

    this.openAIClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
    return this.openAIClient;
  }
}
