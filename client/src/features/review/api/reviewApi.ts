import { env } from "@/config/env";
import type {
  AnalyzeReviewResult,
  PublishReviewResult,
  ReviewDraftComment,
  ReviewPullRequest,
  ReviewPullRequestFile,
} from "@/features/review/types/review.types";
import { baseService } from "@/services/baseService";

interface ListPullRequestsResponse {
  message: string;
  knowledgeBaseId: string;
  fullName: string;
  pullRequests: ReviewPullRequest[];
  page: number;
  perPage: number;
  hasNextPage: boolean;
}

interface PullRequestDetailResponse {
  message: string;
  knowledgeBaseId: string;
  pullRequest: ReviewPullRequest;
  files: ReviewPullRequestFile[];
}

interface AnalyzeResponse extends AnalyzeReviewResult {
  message: string;
}

interface PublishResponse extends PublishReviewResult {
  message: string;
}

function pullsBase(owner: string, repo: string) {
  return `/review/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
}

export const reviewApi = {
  async listPullRequests(
    owner: string,
    repo: string,
    query: { state?: "open" | "closed" | "all"; page?: number } = {},
  ) {
    const response = await baseService.get<ListPullRequestsResponse>(
      pullsBase(owner, repo),
      {
        params: {
          state: query.state ?? "open",
          ...(query.page ? { page: query.page } : {}),
        },
      },
    );
    return response.data;
  },

  async getPullRequest(owner: string, repo: string, number: number) {
    const response = await baseService.get<PullRequestDetailResponse>(
      `${pullsBase(owner, repo)}/${number}`,
    );
    return response.data;
  },

  async analyzePullRequest(owner: string, repo: string, number: number) {
    const response = await baseService.post<AnalyzeResponse>(
      `${pullsBase(owner, repo)}/${number}/analyze`,
      undefined,
      { timeout: env.documentApiTimeoutMs },
    );
    return response.data;
  },

  async publishReview(
    owner: string,
    repo: string,
    number: number,
    input: {
      body?: string;
      comments: Array<
        Pick<ReviewDraftComment, "path" | "line" | "side" | "body">
      >;
    },
  ) {
    const response = await baseService.post<PublishResponse>(
      `${pullsBase(owner, repo)}/${number}/publish`,
      input,
    );
    return response.data;
  },
};
