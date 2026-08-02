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
  PATCH_PREVIEW_CHARS,
  REVIEW_LLM_MODEL,
} from "./review.constants.js";
import type { ReviewJobRepository } from "./review.job.repository.js";
import { extractRightSideLines, truncatePatch } from "./review.patch.js";
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from "./review.prompts.js";
import type {
  AnalyzeReviewResult,
  AutoReviewConfigView,
  GithubPrPort,
  KnowledgeLookupPort,
  LlmComment,
  PublishReviewCommentInput,
  PublishReviewResult,
  RetrievalPort,
  ReviewPullRequestDetail,
  UpdateAutoReviewInput,
} from "./review.types.js";
import {
  buildGithubWebhookUrl,
  buildRetrievalQuery,
  formatContextChunks,
  normalizeDraftComments,
  parseLlmCommentsJson,
  preferMatchingChunks,
  toAutoReviewConfigView,
} from "./review.utils.js";
import { parsePullRequestWebhookPayload } from "./review.webhook.js";

export class ReviewService {
  private openAIClient: OpenAI | null = null;

  constructor(
    private readonly github: GithubPrPort,
    private readonly knowledge: KnowledgeLookupPort,
    private readonly retrieval: RetrievalPort,
    private readonly autoReviewConfigs: AutoReviewConfigRepository,
    private readonly reviewJobs: ReviewJobRepository,
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
    if (!included.length) {
      return {
        pullRequestNumber: number,
        knowledgeBaseId: knowledgeBase.knowledgeBaseId,
        analyzedFiles: [],
        skippedFiles,
        comments: [],
      };
    }

    const fileContexts = await Promise.all(
      included.map(async (file) => {
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
      }),
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

    return {
      pullRequestNumber: number,
      knowledgeBaseId: knowledgeBase.knowledgeBaseId,
      analyzedFiles: included.map((file) => file.filename),
      skippedFiles,
      comments: normalizeDraftComments(rawComments, fileContexts),
    };
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
  ): Promise<PublishReviewResult> {
    await this.knowledge.getReadyKnowledgeBase(userId, owner, repo);

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

    const review = await this.github.createReview(
      accessToken,
      owner,
      repo,
      number,
      {
        commitId: pullRequest.headSha,
        body: input.body?.trim() || DEFAULT_REVIEW_SUMMARY,
        comments: input.comments.map((comment) => ({
          path: comment.path.trim(),
          body: comment.body.trim(),
          line: comment.line,
          side: comment.side === "LEFT" ? "LEFT" : "RIGHT",
        })),
      },
    );

    return {
      reviewId: review.id,
      htmlUrl: review.htmlUrl || pullRequest.htmlUrl,
      state: review.state,
      publishedCount: input.comments.length,
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
  }): Promise<void> {
    const analysis = await this.analyzePullRequest(
      job.userId,
      job.owner,
      job.repo,
      job.prNumber,
    );

    if (!analysis.comments.length) {
      logger.info(
        {
          jobId: job.jobId,
          owner: job.owner,
          repo: job.repo,
          prNumber: job.prNumber,
        },
        "Auto-review produced no comments",
      );
      return;
    }

    await this.publishReview(job.userId, job.owner, job.repo, job.prNumber, {
      body: AUTO_REVIEW_SUMMARY,
      comments: analysis.comments.map((comment) => ({
        path: comment.path,
        line: comment.line,
        side: comment.side,
        body: comment.body,
      })),
    });
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
