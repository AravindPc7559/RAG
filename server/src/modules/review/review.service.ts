import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AutoReviewConfigRepository } from "./review.auto-config.repository.js";
import {
  AUTO_REVIEW_SUMMARY,
  DEFAULT_REVIEW_SUMMARY,
  MAX_CONTEXT_CHUNKS_PER_FILE,
  MAX_PATCH_CHARS,
} from "./review.constants.js";
import type { ReviewJobRepository } from "./review.job.repository.js";
import { ReviewLlmClient } from "./review.llm.js";
import {
  toAutoReviewConfigView,
  toGithubReviewComments,
  toPublishCommentsFromDrafts,
  toPullRequestFileSummaries,
} from "./review.mappers.js";
import { extractRightSideLines, truncatePatch } from "./review.patch.js";
import type {
  AnalyzeFileContext,
  AnalyzeReviewResult,
  AutoReviewConfigView,
  GithubPrPort,
  HandleGithubWebhookInput,
  KnowledgeLookupPort,
  ListPullRequestsQuery,
  ProcessAutoReviewJobInput,
  PublishReviewInput,
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
  preferMatchingChunks,
} from "./review.utils.js";
import {
  assertPublishComments,
  assertTargetBranch,
  partitionAnalyzableFiles,
} from "./review.validators.js";
import { parsePullRequestWebhookPayload } from "./review.webhook.js";

export class ReviewService {
  private readonly llm = new ReviewLlmClient();

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
    query: ListPullRequestsQuery,
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
      files: toPullRequestFileSummaries(files),
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

    const { included, skippedFiles } = partitionAnalyzableFiles(files);
    if (!included.length) {
      return {
        pullRequestNumber: number,
        knowledgeBaseId: knowledgeBase.knowledgeBaseId,
        analyzedFiles: [],
        skippedFiles,
        comments: [],
      };
    }

    const fileContexts = await this.buildFileContexts({
      userId,
      knowledgeBaseId: knowledgeBase.knowledgeBaseId,
      title: pullRequest.title,
      body: pullRequest.body,
      files: included,
    });

    const rawComments = await this.llm.generateComments({
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
    input: PublishReviewInput,
  ): Promise<PublishReviewResult> {
    await this.knowledge.getReadyKnowledgeBase(userId, owner, repo);
    assertPublishComments(input.comments);

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
        comments: toGithubReviewComments(input.comments),
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
    const targetBranch = assertTargetBranch(input.targetBranch);
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

    const webhook = await this.ensureRepositoryWebhook(
      accessToken,
      owner,
      repo,
      existing?.webhookId,
    );

    const saved = await this.autoReviewConfigs.upsert({
      userId,
      knowledgeBaseId: knowledgeBase.knowledgeBaseId,
      githubRepoId: knowledgeBase.githubRepoId,
      owner,
      repo,
      enabled: true,
      targetBranch,
      webhookId: webhook.webhookId,
      webhookActive: webhook.webhookActive,
    });

    return toAutoReviewConfigView(saved);
  }

  public async handleGithubWebhook(
    input: HandleGithubWebhookInput,
  ): Promise<{ accepted: boolean; enqueued: number }> {
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

  public async processAutoReviewJob(
    job: ProcessAutoReviewJobInput,
  ): Promise<void> {
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
      comments: toPublishCommentsFromDrafts(analysis.comments),
    });
  }

  private async buildFileContexts(input: {
    userId: string;
    knowledgeBaseId: string;
    title: string;
    body: string | null;
    files: Array<{ filename: string; patch?: string }>;
  }): Promise<AnalyzeFileContext[]> {
    return Promise.all(
      input.files.map(async (file) => {
        const patch = truncatePatch(file.patch!, MAX_PATCH_CHARS);
        const validLines = extractRightSideLines(patch);
        const chunks = await this.retrieval.retrieveContext({
          userId: input.userId,
          knowledgeBaseId: input.knowledgeBaseId,
          query: buildRetrievalQuery({
            title: input.title,
            body: input.body,
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
  }

  private async ensureRepositoryWebhook(
    accessToken: string,
    owner: string,
    repo: string,
    existingWebhookId?: number,
  ): Promise<{ webhookId: number; webhookActive: boolean }> {
    if (!env.GITHUB_WEBHOOK_SECRET) {
      throw AppError.serviceUnavailable(
        "GITHUB_WEBHOOK_SECRET is required to enable auto-review. Add it to server/.env.",
      );
    }

    const webhookUrl = buildGithubWebhookUrl();
    let webhookId = existingWebhookId;
    let webhookActive = false;

    if (webhookId) {
      const current = await this.github.getWebhook(
        accessToken,
        owner,
        repo,
        webhookId,
      );
      if (current) {
        return {
          webhookId: current.id,
          webhookActive: current.active,
        };
      }
      webhookId = undefined;
    }

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
      return {
        webhookId: created.id,
        webhookActive: created.active,
      };
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 403) {
        throw AppError.forbidden(
          "Need admin access on this repository to manage webhooks for auto-review.",
        );
      }
      throw error;
    }
  }
}
