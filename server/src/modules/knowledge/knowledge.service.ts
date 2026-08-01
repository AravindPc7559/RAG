import { randomUUID } from "node:crypto";

import { AppError } from "../../shared/errors/AppError.js";
import { chunkText } from "../../shared/utils/createTextChunks.js";
import type {
  DocumentChunkInput,
  DocumentRepository,
} from "../document/document.repository.js";
import {
  knowledgeIngestLimits,
  selectIngestiblePaths,
} from "./knowledge.filters.js";
import type { KnowledgeJobDocument } from "./knowledge.job.model.js";
import type { KnowledgeJobRepository } from "./knowledge.job.repository.js";
import type { KnowledgeBaseDocument } from "./knowledge.model.js";
import type { KnowledgeRepository } from "./knowledge.repository.js";
import type {
  GithubContentPort,
  KnowledgeBaseSummary,
} from "./knowledge.types.js";

function guessMimeType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) {
    return "text/markdown";
  }
  if (lower.endsWith(".json")) {
    return "application/json";
  }
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) {
    return "text/typescript";
  }
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) {
    return "text/javascript";
  }
  return "text/plain";
}

export class KnowledgeService {
  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly githubContent: GithubContentPort,
    private readonly jobRepository: KnowledgeJobRepository,
  ) {}

  public async listKnowledgeBases(
    userId: string,
  ): Promise<KnowledgeBaseSummary[]> {
    const records = await this.knowledgeRepository.listByUserId(userId);
    return records.map((record) => this.toSummary(record));
  }

  public async getKnowledgeBase(
    userId: string,
    owner: string,
    repo: string,
  ): Promise<KnowledgeBaseSummary> {
    const record = await this.requireByOwnerRepo(userId, owner, repo);
    return this.toSummary(record);
  }

  public async importRepository(
    userId: string,
    owner: string,
    repo: string,
  ): Promise<KnowledgeBaseSummary> {
    const normalizedOwner = owner.trim();
    const normalizedRepo = repo.trim();
    if (!normalizedOwner || !normalizedRepo) {
      throw AppError.badRequest("Repository owner and name are required.");
    }

    const existing = await this.knowledgeRepository.findByOwnerRepo(
      userId,
      normalizedOwner,
      normalizedRepo,
    );
    if (existing) {
      throw AppError.conflict(
        "This repository is already imported. Use Sync to refresh it.",
        { knowledgeBaseId: existing.knowledgeBaseId },
      );
    }

    const accessToken = await this.githubContent.getAccessToken(userId);
    const repository = await this.githubContent.getRepository(
      accessToken,
      normalizedOwner,
      normalizedRepo,
    );

    const byGithubId = await this.knowledgeRepository.findByGithubRepoId(
      userId,
      String(repository.id),
    );
    if (byGithubId) {
      throw AppError.conflict(
        "This repository is already imported. Use Sync to refresh it.",
        { knowledgeBaseId: byGithubId.knowledgeBaseId },
      );
    }

    const knowledgeBaseId = randomUUID();
    const created = await this.knowledgeRepository.create({
      userId,
      knowledgeBaseId,
      githubRepoId: String(repository.id),
      owner: repository.owner.toLowerCase(),
      repo: repository.name,
      fullName: repository.fullName,
      defaultBranch: repository.defaultBranch,
      htmlUrl: repository.htmlUrl,
      status: "indexing",
    });

    await this.jobRepository.enqueue({
      type: "import",
      userId,
      knowledgeBaseId,
      owner: repository.owner.toLowerCase(),
      repo: repository.name,
      githubOwner: repository.owner,
      githubRepo: repository.name,
      defaultBranch: repository.defaultBranch,
      fullName: repository.fullName,
    });

    return this.toSummary(created);
  }

  public async syncRepository(
    userId: string,
    owner: string,
    repo: string,
  ): Promise<KnowledgeBaseSummary> {
    const existing = await this.requireByOwnerRepo(userId, owner, repo);

    if (
      existing.status === "indexing" ||
      (await this.jobRepository.hasActiveOrQueuedJob(existing.knowledgeBaseId))
    ) {
      throw AppError.conflict("This repository is currently being indexed.");
    }

    const accessToken = await this.githubContent.getAccessToken(userId);
    const repository = await this.githubContent.getRepository(
      accessToken,
      existing.owner,
      existing.repo,
    );

    const updated = await this.knowledgeRepository.updateStatus(
      existing.knowledgeBaseId,
      userId,
      {
        status: "indexing",
        errorMessage: null,
        processedFiles: 0,
        totalFiles: 0,
        defaultBranch: repository.defaultBranch,
      },
    );

    await this.jobRepository.enqueue({
      type: "sync",
      userId,
      knowledgeBaseId: existing.knowledgeBaseId,
      owner: existing.owner,
      repo: existing.repo,
      githubOwner: repository.owner,
      githubRepo: repository.name,
      defaultBranch: repository.defaultBranch,
      fullName: repository.fullName,
    });

    return this.toSummary(updated ?? existing);
  }

  public async processJob(job: KnowledgeJobDocument): Promise<void> {
    const userId = String(job.userId);

    try {
      if (job.type === "sync") {
        await this.documentRepository.deleteDocumentChunks(
          job.knowledgeBaseId,
          userId,
        );
      }

      const accessToken = await this.githubContent.getAccessToken(userId);
      const indexed = await this.indexRepository({
        userId,
        knowledgeBaseId: job.knowledgeBaseId,
        owner: job.githubOwner,
        repo: job.githubRepo,
        defaultBranch: job.defaultBranch,
        fullName: job.fullName,
        accessToken,
      });

      await this.knowledgeRepository.updateStatus(
        job.knowledgeBaseId,
        userId,
        {
          status: "ready",
          errorMessage: null,
          fileCount: indexed.fileCount,
          chunkCount: indexed.chunkCount,
          processedFiles: indexed.fileCount,
          totalFiles: indexed.totalFiles,
          defaultBranch: job.defaultBranch,
          lastSyncedAt: new Date(),
        },
      );

      await this.jobRepository.markDone(job.jobId);
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : "Failed to index repository knowledge base.";

      await this.knowledgeRepository.updateStatus(
        job.knowledgeBaseId,
        userId,
        {
          status: "failed",
          errorMessage: message,
        },
      );
      await this.jobRepository.markFailed(job.jobId, message);
    }
  }

  private async indexRepository(input: {
    userId: string;
    knowledgeBaseId: string;
    owner: string;
    repo: string;
    defaultBranch: string;
    fullName: string;
    accessToken: string;
  }): Promise<{ fileCount: number; chunkCount: number; totalFiles: number }> {
    const tree = await this.githubContent.getRepositoryTree(
      input.accessToken,
      input.owner,
      input.repo,
      input.defaultBranch,
    );

    const selected = selectIngestiblePaths(tree.blobs);
    if (!selected.length) {
      throw AppError.badRequest(
        "No supported source files were found to index in this repository.",
      );
    }

    await this.knowledgeRepository.updateProgress(input.knowledgeBaseId, {
      processedFiles: 0,
      totalFiles: selected.length,
      chunkCount: 0,
    });

    let fileCount = 0;
    let chunkCount = 0;
    let chunkIndex = 0;

    for (const [index, file] of selected.entries()) {
      const content = await this.githubContent.getFileContent(
        input.accessToken,
        input.owner,
        input.repo,
        file.path,
        input.defaultBranch,
      );

      if (!content?.trim()) {
        await this.knowledgeRepository.updateProgress(input.knowledgeBaseId, {
          processedFiles: index + 1,
          totalFiles: selected.length,
          chunkCount,
        });
        continue;
      }

      if (Buffer.byteLength(content, "utf8") > knowledgeIngestLimits.maxFileBytes) {
        await this.knowledgeRepository.updateProgress(input.knowledgeBaseId, {
          processedFiles: index + 1,
          totalFiles: selected.length,
          chunkCount,
        });
        continue;
      }

      const textChunks = chunkText(`File: ${file.path}\n\n${content}`);
      if (!textChunks.length) {
        await this.knowledgeRepository.updateProgress(input.knowledgeBaseId, {
          processedFiles: index + 1,
          totalFiles: selected.length,
          chunkCount,
        });
        continue;
      }

      const fileChunks: DocumentChunkInput[] = [];
      for (const text of textChunks) {
        const embedding = await this.documentRepository.createEmbedding(text);
        if (!embedding.length) {
          continue;
        }

        fileChunks.push({
          userId: input.userId,
          documentId: input.knowledgeBaseId,
          fileName: input.fullName,
          mimeType: guessMimeType(file.path),
          sourceType: "github",
          sourcePath: file.path,
          chunkIndex,
          embedding,
          text,
        });
        chunkIndex += 1;
      }

      if (fileChunks.length) {
        const created =
          await this.documentRepository.createDocumentChunks(fileChunks);
        chunkCount += created;
        fileCount += 1;
      }

      await this.knowledgeRepository.updateProgress(input.knowledgeBaseId, {
        processedFiles: index + 1,
        totalFiles: selected.length,
        chunkCount,
      });
    }

    if (!chunkCount) {
      throw AppError.badRequest(
        "Unable to create embeddings for this repository. Check OPENAI_API_KEY and try again.",
      );
    }

    return {
      fileCount,
      chunkCount,
      totalFiles: selected.length,
    };
  }

  private async requireByOwnerRepo(
    userId: string,
    owner: string,
    repo: string,
  ): Promise<KnowledgeBaseDocument> {
    const record = await this.knowledgeRepository.findByOwnerRepo(
      userId,
      owner.trim(),
      repo.trim(),
    );

    if (!record) {
      throw AppError.notFound("Knowledge base");
    }

    return record;
  }

  private toSummary(record: KnowledgeBaseDocument): KnowledgeBaseSummary {
    return {
      knowledgeBaseId: record.knowledgeBaseId,
      source: "github",
      githubRepoId: record.githubRepoId,
      owner: record.owner,
      repo: record.repo,
      fullName: record.fullName,
      defaultBranch: record.defaultBranch,
      htmlUrl: record.htmlUrl,
      status: record.status,
      ...(record.errorMessage ? { errorMessage: record.errorMessage } : {}),
      fileCount: record.fileCount,
      chunkCount: record.chunkCount,
      processedFiles: record.processedFiles ?? 0,
      totalFiles: record.totalFiles ?? 0,
      ...(record.lastSyncedAt
        ? { lastSyncedAt: record.lastSyncedAt.toISOString() }
        : {}),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
