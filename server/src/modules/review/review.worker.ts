import { logger } from "../../config/logger.js";
import type { ReviewJobRepository } from "./review.job.repository.js";
import type { ReviewService } from "./review.service.js";

export class ReviewWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private processing = false;

  constructor(
    private readonly reviewService: ReviewService,
    private readonly jobRepository: ReviewJobRepository,
    private readonly pollIntervalMs = 2_000,
  ) {}

  public start() {
    if (this.running) {
      return;
    }

    this.running = true;
    logger.info(
      { pollIntervalMs: this.pollIntervalMs },
      "Review worker started",
    );
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
    this.timer.unref();
  }

  public stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info("Review worker stopped");
  }

  private async tick() {
    if (!this.running || this.processing) {
      return;
    }

    this.processing = true;
    try {
      const job = await this.jobRepository.claimNext();
      if (!job) {
        return;
      }

      logger.info(
        {
          jobId: job.jobId,
          knowledgeBaseId: job.knowledgeBaseId,
          owner: job.owner,
          repo: job.repo,
          prNumber: job.prNumber,
        },
        "Processing auto-review job",
      );

      try {
        await this.reviewService.processAutoReviewJob({
          jobId: job.jobId,
          userId: String(job.userId),
          owner: job.owner,
          repo: job.repo,
          prNumber: job.prNumber,
        });
        await this.jobRepository.markDone(job.jobId);
        logger.info({ jobId: job.jobId }, "Auto-review job finished");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Auto-review job failed.";
        await this.jobRepository.markFailed(job.jobId, message);
        logger.error({ error, jobId: job.jobId }, "Auto-review job failed");
      }
    } catch (error) {
      logger.error({ error }, "Review worker tick failed");
    } finally {
      this.processing = false;
    }
  }
}
