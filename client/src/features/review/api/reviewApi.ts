import { env } from "@/config/env";
import type {
  AnalyzeReviewResponse,
  AutoReviewResponse,
  ListPullRequestsResponse,
  PublishReviewInput,
  PublishReviewResponse,
  PullRequestDetailResponse,
  PullStateFilter,
  UpdateAutoReviewInput,
} from "@/features/review/types/review.types";
import {
  reviewAutoReviewPath,
  reviewPullsPath,
} from "@/features/review/utils/reviewPaths";
import { baseService } from "@/services/baseService";

export const reviewApi = {
  async listPullRequests(
    owner: string,
    repo: string,
    query: { state?: PullStateFilter; page?: number } = {},
  ) {
    const response = await baseService.get<ListPullRequestsResponse>(
      reviewPullsPath(owner, repo),
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
      `${reviewPullsPath(owner, repo)}/${number}`,
    );
    return response.data;
  },

  async analyzePullRequest(owner: string, repo: string, number: number) {
    const response = await baseService.post<AnalyzeReviewResponse>(
      `${reviewPullsPath(owner, repo)}/${number}/analyze`,
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
    const response = await baseService.post<PublishReviewResponse>(
      `${reviewPullsPath(owner, repo)}/${number}/publish`,
      input,
    );
    return response.data;
  },

  async getAutoReview(owner: string, repo: string) {
    const response = await baseService.get<AutoReviewResponse>(
      reviewAutoReviewPath(owner, repo),
    );
    return response.data.autoReview;
  },

  async updateAutoReview(
    owner: string,
    repo: string,
    input: UpdateAutoReviewInput,
  ) {
    const response = await baseService.put<AutoReviewResponse>(
      reviewAutoReviewPath(owner, repo),
      input,
    );
    return response.data.autoReview;
  },
};
