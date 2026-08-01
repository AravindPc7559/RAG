import { env } from "@/config/env";
import type { KnowledgeBase } from "@/features/knowledge/types/knowledge.types";
import { baseService } from "@/services/baseService";

interface KnowledgeListResponse {
  message: string;
  knowledgeBases: KnowledgeBase[];
}

interface KnowledgeBaseResponse {
  message: string;
  knowledgeBase: KnowledgeBase;
}

function repoPath(owner: string, repo: string) {
  return `/knowledge/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export const knowledgeService = {
  async listKnowledgeBases() {
    const response = await baseService.get<KnowledgeListResponse>(
      "/knowledge",
    );
    return response.data.knowledgeBases;
  },

  async getKnowledgeBase(owner: string, repo: string) {
    const response = await baseService.get<KnowledgeBaseResponse>(
      repoPath(owner, repo),
    );
    return response.data.knowledgeBase;
  },

  async importRepository(owner: string, repo: string) {
    const response = await baseService.post<KnowledgeBaseResponse>(
      `${repoPath(owner, repo)}/import`,
      undefined,
      {
        timeout: env.documentApiTimeoutMs,
      },
    );
    return response.data.knowledgeBase;
  },

  async syncRepository(owner: string, repo: string) {
    const response = await baseService.post<KnowledgeBaseResponse>(
      `${repoPath(owner, repo)}/sync`,
      undefined,
      {
        timeout: env.documentApiTimeoutMs,
      },
    );
    return response.data.knowledgeBase;
  },
};
