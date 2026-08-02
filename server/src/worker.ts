import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { GithubRepository } from "./modules/github/github.repository.js";
import { GithubService } from "./modules/github/github.service.js";
import { createKnowledgeRuntime } from "./modules/knowledge/knowledge.modules.js";
import { KnowledgeWorker } from "./modules/knowledge/knowledge.worker.js";
import { createReviewModule } from "./modules/review/review.modules.js";
import type { AuthMiddleware } from "./modules/auth/auth.middleware.js";

async function bootstrap() {
  await connectDatabase();

  const githubService = new GithubService(new GithubRepository());
  const knowledgeRuntime = createKnowledgeRuntime(githubService);
  const knowledgeWorker = new KnowledgeWorker(
    knowledgeRuntime.service,
    knowledgeRuntime.jobRepository,
    env.KNOWLEDGE_WORKER_POLL_MS,
  );

  // Auth is unused by the worker; pass a stub middleware for module wiring.
  const authStub = {
    authenticate: async () => undefined,
  } as unknown as AuthMiddleware;

  const review = createReviewModule(authStub, githubService);

  knowledgeWorker.start();
  review.worker.start();
  logger.info("Standalone knowledge + review worker process started");

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Worker shutdown started");
    knowledgeWorker.stop();
    review.worker.stop();
    await disconnectDatabase();
    logger.info("Worker shutdown completed");
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ error }, "Worker startup failed");
  process.exitCode = 1;
});
