export type KnowledgeBaseStatus =
  | "pending"
  | "indexing"
  | "ready"
  | "failed";

export interface KnowledgeBase {
  knowledgeBaseId: string;
  source: "github";
  githubRepoId: string;
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  htmlUrl: string;
  status: KnowledgeBaseStatus;
  errorMessage?: string;
  fileCount: number;
  chunkCount: number;
  processedFiles: number;
  totalFiles: number;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeActionStatus = "idle" | "importing" | "syncing";

export interface KnowledgeRepoState {
  knowledgeBase: KnowledgeBase | null;
  actionStatus: KnowledgeActionStatus;
  error?: string;
}

export function knowledgeRepoKey(owner: string, repo: string) {
  return `${owner.toLowerCase()}/${repo}`;
}

export function isKnowledgeIndexing(knowledgeBase?: KnowledgeBase | null) {
  return (
    knowledgeBase?.status === "indexing" ||
    knowledgeBase?.status === "pending"
  );
}
