import type { RequestHandler } from "express";

import {
  readListPullRequestsQuery,
  readPublishReviewBody,
  readUpdateAutoReviewBody,
  readWebhookRequest,
  requirePullParams,
  requireRepoParams,
  requireUserId,
} from "./review.request.js";
import type { ReviewService } from "./review.service.js";

export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  public listPullRequests: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const { owner, repo } = requireRepoParams(request.params);

    const result = await this.reviewService.listPullRequests(
      userId,
      owner,
      repo,
      readListPullRequestsQuery(request.query),
    );

    response.status(200).json({
      message: "Pull requests fetched successfully",
      ...result,
    });
  };

  public getPullRequest: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const { owner, repo, number } = requirePullParams(request.params);

    const detail = await this.reviewService.getPullRequestDetail(
      userId,
      owner,
      repo,
      number,
    );

    response.status(200).json({
      message: "Pull request fetched successfully",
      ...detail,
    });
  };

  public analyzePullRequest: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const { owner, repo, number } = requirePullParams(request.params);

    const result = await this.reviewService.analyzePullRequest(
      userId,
      owner,
      repo,
      number,
    );

    response.status(200).json({
      message: "Pull request analyzed successfully",
      ...result,
    });
  };

  public publishReview: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const { owner, repo, number } = requirePullParams(request.params);

    const result = await this.reviewService.publishReview(
      userId,
      owner,
      repo,
      number,
      readPublishReviewBody(request.body),
    );

    response.status(200).json({
      message: "Review published successfully",
      ...result,
    });
  };

  public getAutoReview: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const { owner, repo } = requireRepoParams(request.params);

    const autoReview = await this.reviewService.getAutoReviewConfig(
      userId,
      owner,
      repo,
    );

    response.status(200).json({
      message: "Auto-review settings fetched successfully",
      autoReview,
    });
  };

  public updateAutoReview: RequestHandler = async (request, response) => {
    const userId = requireUserId(request.user?.id);
    const { owner, repo } = requireRepoParams(request.params);
    const input = readUpdateAutoReviewBody(request.body);

    const autoReview = await this.reviewService.updateAutoReviewConfig(
      userId,
      owner,
      repo,
      input,
    );

    response.status(200).json({
      message: input.enabled
        ? "Auto-review enabled successfully"
        : "Auto-review disabled successfully",
      autoReview,
    });
  };

  public handleGithubWebhook: RequestHandler = async (request, response) => {
    const result = await this.reviewService.handleGithubWebhook(
      readWebhookRequest(request),
    );

    response.status(202).json({
      message: "Webhook accepted",
      ...result,
    });
  };
}
