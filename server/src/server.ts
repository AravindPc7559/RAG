import { createServer } from "node:http";

import { createApp } from "./app.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

async function bootstrap() {
  await connectDatabase();

  const server = createServer(createApp());
  let isShuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info({ signal }, "Graceful shutdown started");

    const forceShutdownTimer = setTimeout(() => {
      logger.fatal("Graceful shutdown timed out");
      process.exit(1);
    }, 10_000);
    forceShutdownTimer.unref();

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await disconnectDatabase();
    clearTimeout(forceShutdownTimer);
    logger.info("Graceful shutdown completed");
  };

  const handleSignal = (signal: NodeJS.Signals) => {
    void shutdown(signal).catch((error: unknown) => {
      logger.fatal({ error, signal }, "Graceful shutdown failed");
      process.exitCode = 1;
    });
  };

  process.once("SIGINT", () => {
    handleSignal("SIGINT");
  });
  process.once("SIGTERM", () => {
    handleSignal("SIGTERM");
  });

  server.listen(env.PORT, env.HOST, () => {
    logger.info(
      {
        host: env.HOST,
        port: env.PORT,
        environment: env.NODE_ENV,
        apiPrefix: env.API_PREFIX,
      },
      "HTTP server started",
    );
  });
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ error }, "Server startup failed");
  process.exitCode = 1;
});
