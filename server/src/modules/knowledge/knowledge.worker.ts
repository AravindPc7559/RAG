import { logger } from "../../config/logger.js";
import type { KnowledgeJobRepository } from "./knowledge.job.repository.js";
import type { KnowledgeService } from "./knowledge.service.js";

export class KnowledgeWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private processing = false;

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly jobRepository: KnowledgeJobRepository,
    private readonly pollIntervalMs = 2_000,
  ) {}

  public start() {
    if (this.running) {
      return;
    }

    this.running = true;
    logger.info(
      { pollIntervalMs: this.pollIntervalMs },
      "Knowledge worker started",
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
    logger.info("Knowledge worker stopped");
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
          type: job.type,
          knowledgeBaseId: job.knowledgeBaseId,
          fullName: job.fullName,
        },
        "Processing knowledge job",
      );

      await this.knowledgeService.processJob(job);

      logger.info(
        {
          jobId: job.jobId,
          knowledgeBaseId: job.knowledgeBaseId,
        },
        "Knowledge job finished",
      );
    } catch (error) {
      logger.error({ error }, "Knowledge worker tick failed");
    } finally {
      this.processing = false;
    }
  }
}
