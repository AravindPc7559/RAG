import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

import {
  ReviewRunModel,
  type ReviewRunDocument,
  type ReviewRunEntity,
  type ReviewRunSeverityCounts,
  type ReviewRunSource,
  type ReviewRunStatus,
} from "./review.run.model.js";

export interface CreateReviewRunInput {
  userId: string;
  knowledgeBaseId: string;
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
  prTitle: string;
  source: ReviewRunSource;
  status: ReviewRunStatus;
  jobId?: string;
  githubReviewId?: number;
  htmlUrl?: string;
  githubState?: string;
  publishedCount?: number;
  comments?: ReviewRunEntity["comments"];
  analyzedFiles?: string[];
  skippedFiles?: string[];
  summaryBody?: string;
  errorMessage?: string;
  severityCounts?: ReviewRunSeverityCounts;
}

export interface ListReviewRunsQuery {
  owner?: string;
  repo?: string;
  source?: ReviewRunSource;
  status?: ReviewRunStatus;
  page?: number;
  perPage?: number;
}

export interface ReviewRunStats {
  totalRuns: number;
  generatedCount: number;
  publishedCount: number;
  failedCount: number;
  noCommentsCount: number;
  manualCount: number;
  autoCount: number;
  commentsPublished: number;
  commentsGenerated: number;
  severityTotals: ReviewRunSeverityCounts;
  last7Days: Array<{ date: string; count: number }>;
  topRepos: Array<{ owner: string; repo: string; count: number }>;
}

function emptySeverityCounts(): ReviewRunSeverityCounts {
  return { info: 0, warning: 0, important: 0 };
}

function last7DayKeys(now = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    day.setUTCDate(day.getUTCDate() - offset);
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
}

export class ReviewRunRepository {
  public async create(input: CreateReviewRunInput): Promise<ReviewRunDocument> {
    return ReviewRunModel.create({
      runId: randomUUID(),
      userId: new mongoose.Types.ObjectId(input.userId),
      knowledgeBaseId: input.knowledgeBaseId,
      owner: input.owner.toLowerCase(),
      repo: input.repo,
      prNumber: input.prNumber,
      headSha: input.headSha,
      prTitle: input.prTitle || `Pull request #${input.prNumber}`,
      source: input.source,
      status: input.status,
      ...(input.jobId ? { jobId: input.jobId } : {}),
      ...(typeof input.githubReviewId === "number"
        ? { githubReviewId: input.githubReviewId }
        : {}),
      ...(input.htmlUrl ? { htmlUrl: input.htmlUrl } : {}),
      ...(input.githubState ? { githubState: input.githubState } : {}),
      publishedCount: input.publishedCount ?? 0,
      comments: input.comments ?? [],
      analyzedFiles: input.analyzedFiles ?? [],
      skippedFiles: input.skippedFiles ?? [],
      ...(input.summaryBody ? { summaryBody: input.summaryBody } : {}),
      ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
      severityCounts: input.severityCounts ?? emptySeverityCounts(),
      finishedAt: new Date(),
    });
  }

  public async markPublished(
    userId: string,
    runId: string,
    input: {
      githubReviewId: number;
      htmlUrl: string;
      githubState: string;
      publishedCount: number;
      comments: ReviewRunEntity["comments"];
      summaryBody?: string;
      severityCounts: ReviewRunSeverityCounts;
    },
  ): Promise<ReviewRunDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return ReviewRunModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        runId,
      },
      {
        $set: {
          status: "published",
          githubReviewId: input.githubReviewId,
          htmlUrl: input.htmlUrl,
          githubState: input.githubState,
          publishedCount: input.publishedCount,
          comments: input.comments,
          severityCounts: input.severityCounts,
          finishedAt: new Date(),
          ...(input.summaryBody ? { summaryBody: input.summaryBody } : {}),
        },
        $unset: { errorMessage: 1 },
      },
      { new: true },
    ).exec();
  }

  public async findLatestGeneratedForPr(
    userId: string,
    owner: string,
    repo: string,
    prNumber: number,
    headSha: string,
  ): Promise<ReviewRunDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return ReviewRunModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      owner: owner.toLowerCase(),
      repo,
      prNumber,
      headSha,
      status: "generated",
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  public async findByRunIdForUser(
    userId: string,
    runId: string,
  ): Promise<ReviewRunDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return ReviewRunModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      runId,
    }).exec();
  }

  public async listForUser(
    userId: string,
    query: ListReviewRunsQuery = {},
  ): Promise<{
    runs: ReviewRunDocument[];
    page: number;
    perPage: number;
    hasNextPage: boolean;
    total: number;
  }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { runs: [], page: 1, perPage: 20, hasNextPage: false, total: 0 };
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const perPage =
      query.perPage && query.perPage > 0 ? Math.min(query.perPage, 50) : 20;

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (query.owner?.trim()) {
      filter.owner = query.owner.trim().toLowerCase();
    }
    if (query.repo?.trim()) {
      filter.repo = query.repo.trim();
    }
    if (query.source) {
      filter.source = query.source;
    }
    if (query.status) {
      filter.status = query.status;
    }

    const [total, runs] = await Promise.all([
      ReviewRunModel.countDocuments(filter).exec(),
      ReviewRunModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .exec(),
    ]);

    return {
      runs,
      page,
      perPage,
      hasNextPage: page * perPage < total,
      total,
    };
  }

  public async getStatsForUser(userId: string): Promise<ReviewRunStats> {
    const empty: ReviewRunStats = {
      totalRuns: 0,
      generatedCount: 0,
      publishedCount: 0,
      failedCount: 0,
      noCommentsCount: 0,
      manualCount: 0,
      autoCount: 0,
      commentsPublished: 0,
      commentsGenerated: 0,
      severityTotals: emptySeverityCounts(),
      last7Days: last7DayKeys().map((date) => ({ date, count: 0 })),
      topRepos: [],
    };

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return empty;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [totals, dayBuckets, topRepos] = await Promise.all([
      ReviewRunModel.aggregate<{
        totalRuns: number;
        generatedCount: number;
        publishedCount: number;
        failedCount: number;
        noCommentsCount: number;
        manualCount: number;
        autoCount: number;
        commentsPublished: number;
        commentsGenerated: number;
        info: number;
        warning: number;
        important: number;
      }>([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalRuns: { $sum: 1 },
            generatedCount: {
              $sum: { $cond: [{ $eq: ["$status", "generated"] }, 1, 0] },
            },
            publishedCount: {
              $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
            },
            noCommentsCount: {
              $sum: { $cond: [{ $eq: ["$status", "no_comments"] }, 1, 0] },
            },
            manualCount: {
              $sum: { $cond: [{ $eq: ["$source", "manual"] }, 1, 0] },
            },
            autoCount: {
              $sum: { $cond: [{ $eq: ["$source", "auto"] }, 1, 0] },
            },
            commentsPublished: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "published"] },
                  "$publishedCount",
                  0,
                ],
              },
            },
            commentsGenerated: {
              $sum: { $size: "$comments" },
            },
            info: { $sum: "$severityCounts.info" },
            warning: { $sum: "$severityCounts.warning" },
            important: { $sum: "$severityCounts.important" },
          },
        },
      ]).exec(),
      ReviewRunModel.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            userId: userObjectId,
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]).exec(),
      ReviewRunModel.aggregate<{
        owner: string;
        repo: string;
        count: number;
      }>([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: { owner: "$owner", repo: "$repo" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            owner: "$_id.owner",
            repo: "$_id.repo",
            count: 1,
          },
        },
      ]).exec(),
    ]);

    const row = totals[0];
    if (!row) {
      return empty;
    }

    const dayMap = new Map(dayBuckets.map((item) => [item._id, item.count]));

    return {
      totalRuns: row.totalRuns,
      generatedCount: row.generatedCount,
      publishedCount: row.publishedCount,
      failedCount: row.failedCount,
      noCommentsCount: row.noCommentsCount,
      manualCount: row.manualCount,
      autoCount: row.autoCount,
      commentsPublished: row.commentsPublished,
      commentsGenerated: row.commentsGenerated,
      severityTotals: {
        info: row.info,
        warning: row.warning,
        important: row.important,
      },
      last7Days: last7DayKeys().map((date) => ({
        date,
        count: dayMap.get(date) ?? 0,
      })),
      topRepos,
    };
  }
}
