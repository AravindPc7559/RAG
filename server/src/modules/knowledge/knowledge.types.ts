export type KnowledgeBaseStatus =
  | "pending"
  | "indexing"
  | "ready"
  | "failed";

export interface KnowledgeBaseSummary {
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

export interface GithubContentPort {
  getAccessToken(userId: string): Promise<string>;
  getRepository(
    accessToken: string,
    owner: string,
    repo: string,
  ): Promise<{
    id: number;
    name: string;
    fullName: string;
    owner: string;
    defaultBranch: string;
    htmlUrl: string;
  }>;
  getRepositoryTree(
    accessToken: string,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<{ truncated: boolean; blobs: Array<{ path: string; size: number }> }>;
  getFileContent(
    accessToken: string,
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<string | null>;
}
