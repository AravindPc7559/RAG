import OpenAI from "openai";

import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
  DEFAULT_REVIEW_SUMMARY,
  MAX_CHANGED_FILES,
  MAX_COMMENTS,
  MAX_CONTEXT_CHUNKS_PER_FILE,
  MAX_PATCH_CHARS,
  PATCH_PREVIEW_CHARS,
  REVIEW_LLM_MODEL,
} from "./review.constants.js";
import {
  extractRightSideLines,
  truncatePatch,
} from "./review.patch.js";
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from "./review.prompts.js";
import type {
  AnalyzeReviewResult,
  GenerateCommentsInput,
  GithubPrPort,
  KnowledgeLookupPort,
  ListPullRequestsQuery,
  LlmComment,
  PublishReviewCommentInput,
  PublishReviewResult,
  RetrievalPort,
  ReviewFileContext,
  ReviewPullRequestDetail,
} from "./review.types.js";
import {
  buildRetrievalQuery,
  formatContextChunks,
  normalizeDraftComments,
  parseLlmCommentsJson,
  preferMatchingChunks,
} from "./review.utils.js";

export class ReviewService {
  private openAIClient: OpenAI | null = null;

  constructor(
    private readonly github: GithubPrPort,
    private readonly knowledge: KnowledgeLookupPort,
    private readonly retrieval: RetrievalPort,
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

    const fileContexts: ReviewFileContext[] = [];

    for (const file of included) {
      const patch = truncatePatch(file.patch!, MAX_PATCH_CHARS);
      const validLines = extractRightSideLines(patch);
      const query = buildRetrievalQuery({
        title: pullRequest.title,
        body: pullRequest.body,
        filename: file.filename,
        patch,
      });

      const chunks = await this.retrieval.retrieveContext({
        userId,
        knowledgeBaseId: knowledgeBase.knowledgeBaseId,
        query,
        limit: MAX_CONTEXT_CHUNKS_PER_FILE,
      });

      const selected = preferMatchingChunks(
        chunks,
        file.filename,
        MAX_CONTEXT_CHUNKS_PER_FILE,
      );

      fileContexts.push({
        filename: file.filename,
        patch,
        validLines,
        context: formatContextChunks(selected),
      });
    }

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

  private async generateComments(
    input: GenerateCommentsInput,
  ): Promise<LlmComment[]> {
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

    const text = response.output_text?.trim() ?? "[]";
    return parseLlmCommentsJson(text);
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
