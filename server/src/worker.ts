import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { createKnowledgeRuntime } from "./modules/knowledge/knowledge.modules.js";
import { KnowledgeWorker } from "./modules/knowledge/knowledge.worker.js";

async function bootstrap() {
  await connectDatabase();

  const runtime = createKnowledgeRuntime();
  const worker = new KnowledgeWorker(
    runtime.service,
    runtime.jobRepository,
    env.KNOWLEDGE_WORKER_POLL_MS,
  );

  worker.start();
  logger.info("Standalone knowledge worker process started");

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Knowledge worker shutdown started");
    worker.stop();
    await disconnectDatabase();
    logger.info("Knowledge worker shutdown completed");
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
  logger.fatal({ error }, "Knowledge worker startup failed");
  process.exitCode = 1;
});
