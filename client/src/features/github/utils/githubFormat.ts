import type { GithubRepository } from "@/features/github/types/github.types";
import {
  isKnowledgeIndexing,
  type KnowledgeBase,
  type KnowledgeRepoState,
} from "@/features/knowledge/types/knowledge.types";

export interface IndexingProgress {
  totalFiles: number;
  processedFiles: number;
  pendingFiles: number;
  percent: number;
  chunkCount: number;
  hasTotals: boolean;
}

export function formatGithubDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatConnectedAt(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getIndexingProgress(
  kb: KnowledgeBase,
): IndexingProgress {
  const totalFiles = Math.max(0, kb.totalFiles || 0);
  const processedFiles = Math.min(
    Math.max(0, kb.processedFiles || 0),
    totalFiles || Number.MAX_SAFE_INTEGER,
  );
  const pendingFiles = Math.max(totalFiles - processedFiles, 0);
  const percent =
    totalFiles > 0
      ? Math.min(100, Math.round((processedFiles / totalFiles) * 100))
      : 0;

  return {
    totalFiles,
    processedFiles,
    pendingFiles,
    percent,
    chunkCount: kb.chunkCount || 0,
    hasTotals: totalFiles > 0,
  };
}

export function getRepoCardStatusLabel(input: {
  repository: GithubRepository;
  knowledge?: KnowledgeRepoState;
  progress: IndexingProgress | null;
}): string {
  const kb = input.knowledge?.knowledgeBase;
  const actionStatus = input.knowledge?.actionStatus ?? "idle";
  const indexing = isKnowledgeIndexing(kb);

  if (indexing || actionStatus === "importing" || actionStatus === "syncing") {
    if (input.progress?.hasTotals) {
      return `Indexing ${input.progress.percent}%`;
    }
    return actionStatus === "syncing" ? "Syncing…" : "Starting…";
  }

  if (kb?.status === "ready") {
    return "Ready";
  }

  if (kb?.status === "failed") {
    return "Failed";
  }

  return input.repository.visibility;
}
