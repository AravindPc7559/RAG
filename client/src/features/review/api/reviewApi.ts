import { env } from "@/config/env";
import type {
  AnalyzeResponse,
  ListPullRequestsResponse,
  PublishResponse,
  PublishReviewInput,
  PullRequestDetailResponse,
  PullStateFilter,
} from "@/features/review/types/review.types";
import { createPullsApiPath } from "@/features/review/utils/reviewFormat";
import { baseService } from "@/services/baseService";

export const reviewApi = {
  async listPullRequests(
    owner: string,
    repo: string,
    query: { state?: PullStateFilter; page?: number } = {},
  ) {
    const response = await baseService.get<ListPullRequestsResponse>(
      createPullsApiPath(owner, repo),
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
      `${createPullsApiPath(owner, repo)}/${number}`,
    );
    return response.data;
  },

  async analyzePullRequest(owner: string, repo: string, number: number) {
    const response = await baseService.post<AnalyzeResponse>(
      `${createPullsApiPath(owner, repo)}/${number}/analyze`,
      undefined,
      { timeout: env.documentApiTimeoutMs },
    );
    return response.data;
  },

  async publishReview(
    owner: string,
    repo: string,
    number: number,
    input: PublishReviewInput,
  ) {
    const response = await baseService.post<PublishResponse>(
      `${createPullsApiPath(owner, repo)}/${number}/publish`,
      input,
    );
    return response.data;
  },
};
