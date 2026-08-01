import { randomUUID } from "node:crypto";

import OpenAI from "openai";

import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
  extractRightSideLines,
  pickNearestValidLine,
  truncatePatch,
} from "./review.patch.js";
import type {
  AnalyzeReviewResult,
  GithubPrPort,
  KnowledgeLookupPort,
  PublishReviewCommentInput,
  PublishReviewResult,
  RetrievalPort,
  ReviewCommentSeverity,
  ReviewDraftComment,
  ReviewPullRequestDetail,
} from "./review.types.js";

const MAX_CHANGED_FILES = 20;
const MAX_PATCH_CHARS = 12_000;
const MAX_CONTEXT_CHUNKS_PER_FILE = 4;
const MAX_COMMENTS = 25;
const PATCH_PREVIEW_CHARS = 400;

interface LlmComment {
  path?: string;
  line?: number;
  side?: string;
  severity?: string;
  body?: string;
}

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
    query: { state?: "open" | "closed" | "all"; page?: number; perPage?: number },
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

    const fileContexts: Array<{
      filename: string;
      patch: string;
      validLines: Set<number>;
      context: string;
    }> = [];

    for (const file of included) {
      const patch = truncatePatch(file.patch!, MAX_PATCH_CHARS);
      const validLines = extractRightSideLines(patch);
      const query = [
        pullRequest.title,
        pullRequest.body ?? "",
        file.filename,
        patch.slice(0, 1500),
      ]
        .filter(Boolean)
        .join("\n");

      const chunks = await this.retrieval.retrieveContext({
        userId,
        knowledgeBaseId: knowledgeBase.knowledgeBaseId,
        query,
        limit: MAX_CONTEXT_CHUNKS_PER_FILE,
      });

      const preferred = chunks.filter(
        (chunk) =>
          chunk.sourcePath &&
          (chunk.sourcePath === file.filename ||
            file.filename.endsWith(chunk.sourcePath) ||
            chunk.sourcePath.endsWith(file.filename)),
      );
      const selected = (preferred.length ? preferred : chunks).slice(
        0,
        MAX_CONTEXT_CHUNKS_PER_FILE,
      );

      fileContexts.push({
        filename: file.filename,
        patch,
        validLines,
        context: selected
          .map(
            (chunk) =>
              `[${chunk.sourcePath ?? "unknown"}]\n${chunk.text}`,
          )
          .join("\n\n"),
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

    const comments = this.normalizeComments(rawComments, fileContexts);

    return {
      pullRequestNumber: number,
      knowledgeBaseId: knowledgeBase.knowledgeBaseId,
      analyzedFiles: included.map((file) => file.filename),
      skippedFiles,
      comments,
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
        body:
          input.body?.trim() ||
          "SourceSense knowledge-base review comments.",
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

  private async generateComments(input: {
    title: string;
    body: string | null;
    files: Array<{ filename: string; patch: string; context: string }>;
  }): Promise<LlmComment[]> {
    const openAI = this.getOpenAIClient();
    const fileBlocks = input.files
      .map(
        (file) => `
### File: ${file.filename}

Knowledge base context:
${file.context || "(no matching knowledge chunks)"}

Diff:
\`\`\`diff
${file.patch}
\`\`\`
`,
      )
      .join("\n");

    const response = await openAI.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content: `You are a senior code reviewer for SourceSense.
Review pull request diffs using ONLY the provided knowledge-base context and the diff itself.
Return a JSON array of review comments. Each item must be:
{"path":"relative/file/path","line":<number>,"side":"RIGHT","severity":"info"|"warning"|"important","body":"actionable comment"}

Rules:
- Prefer RIGHT-side line numbers from the new file in the diff.
- Only comment on real issues: correctness, regressions vs prior patterns in the knowledge base, security, missing tests, API contract breaks.
- Do not invent files that are not in the diff.
- Keep bodies concise (1-3 sentences), specific, and professional.
- Return at most ${MAX_COMMENTS} comments.
- If nothing notable, return [].
- Output JSON only, no markdown fences.`,
        },
        {
          role: "user",
          content: `PR title: ${input.title}
PR body: ${input.body ?? "(none)"}

${fileBlocks}`,
        },
      ],
    });

    const text = response.output_text?.trim() ?? "[]";
    return parseJsonArray(text);
  }

  private normalizeComments(
    rawComments: LlmComment[],
    fileContexts: Array<{
      filename: string;
      validLines: Set<number>;
    }>,
  ): ReviewDraftComment[] {
    const byPath = new Map(
      fileContexts.map((file) => [file.filename, file.validLines]),
    );
    const comments: ReviewDraftComment[] = [];

    for (const raw of rawComments) {
      if (comments.length >= MAX_COMMENTS) {
        break;
      }

      const path = typeof raw.path === "string" ? raw.path.trim() : "";
      const body = typeof raw.body === "string" ? raw.body.trim() : "";
      if (!path || !body || !byPath.has(path)) {
        continue;
      }

      const preferredLine =
        typeof raw.line === "number" && Number.isFinite(raw.line)
          ? Math.trunc(raw.line)
          : 1;
      const validLines = byPath.get(path)!;
      const line = pickNearestValidLine(preferredLine, validLines);
      if (line === null) {
        continue;
      }

      comments.push({
        id: randomUUID(),
        path,
        line,
        side: raw.side === "LEFT" ? "LEFT" : "RIGHT",
        severity: normalizeSeverity(raw.severity),
        body,
      });
    }

    return comments;
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

function normalizeSeverity(value: unknown): ReviewCommentSeverity {
  if (value === "warning" || value === "important") {
    return value;
  }
  return "info";
}

function parseJsonArray(text: string): LlmComment[] {
  const candidates = [text];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.unshift(fenced[1].trim());
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    candidates.unshift(arrayMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as LlmComment[];
      }
    } catch {
      // try next candidate
    }
  }

  throw AppError.badGateway("Failed to parse review comments from the model.");
}
